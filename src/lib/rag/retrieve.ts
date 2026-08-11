import { latestTranscriptEntry, type PromptInterviewSession } from "@/lib/interview/domain";
import { normalizeRoleSlug } from "@/lib/rag/taxonomy";
import { ragTracePath, writeRagTrace } from "@/lib/rag/trace";
import { logger } from "@/utils/logger";

// Loaded on first use, not at import time. `prompts.ts` imports this file on
// every turn, and unit tests import it without ever retrieving anything --
// neither should pay to load the database client and the embedding model.
async function loadDeps() {
  const [{ prisma }, embeddings] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/rag/embeddings"),
  ]);
  return { prisma, ...embeddings };
}

export interface RetrievedQuestion {
  /** Corpus row id, recorded so the question is not injected again. */
  id: string;
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  similarity: number;
}

/** How many questions end up in the prompt. */
const DEFAULT_LIMIT = 6;
/** Questions fetched from the database before filtering narrows them down. */
const CANDIDATE_POOL = 32;
/** Two questions this similar are treated as the same question. */
const REDUNDANCY_THRESHOLD = 0.85;
/** Balances relevance against variety when picking the final set.
 * 1.0 would pick purely on relevance and allow repetitive sets. */
const MMR_LAMBDA = 0.75;
/**
 * Questions below this score are dropped, even if that means returning fewer
 * than asked for. Without it, the search for variety reaches far enough down the
 * list to pad the prompt with unrelated questions. A few good ones are better.
 *
 * The number looks low because this model's scores sit in a narrow range.
 */
const MIN_SIMILARITY = 0.2;
/** How far back to look for questions this candidate has already seen. */
const PRIOR_QUESTION_LIMIT = 60;
/** Longest retrieval may delay a turn before it gives up. */
const RETRIEVAL_TIMEOUT_MS = 2500;

/**
 * Removes names, emails, phone numbers and links from a resume.
 *
 * They say nothing about what the candidate can build, so they only add noise to
 * the search. Keeping personal details out of the search is also simply better.
 */
function stripContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\b(?:linkedin|github)\.com\/\S+/gi, " ")
    // The name line most resumes open with.
    .replace(/^\s*[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}\s*[.,\n]/, " ");
}

/**
 * Trims text down to a size the search can use, keeping whole sentences.
 *
 * Sentences matter: the model was trained on ordinary writing and handles it far
 * better than a list of keywords. An earlier version reduced text to keywords
 * and ranked them by how often each appeared -- but resume words nearly all
 * appear once, so it silently fell back to alphabetical order and kept whichever
 * words started with early letters.
 */
function condenseForEmbedding(text: string | null | undefined, maxChars: number): string {
  if (!text) {
    return "";
  }

  const cleaned = stripContactDetails(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  // Cut at a sentence end where possible, so no sentence is left half-finished.
  const truncated = cleaned.slice(0, maxChars);
  const lastBreak = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("; "));
  return lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak + 1) : truncated;
}

/** Different meaningful words an answer needs before it counts as an answer. */
const MIN_ANSWER_CONTENT_WORDS = 4;

/** Common words that say nothing about the topic, ignored in the count above. */
const ANSWER_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had", "was", "were",
  "you", "your", "will", "are", "not", "but", "all", "can", "could", "would", "should", "did",
  "its", "our", "their", "them", "then", "there", "here", "what", "when", "which", "who",
  "how", "why", "some", "just", "like", "really", "very", "much", "more", "also", "about",
  "yeah", "yes", "okay", "well", "basically", "actually", "maybe", "think", "guess", "know",
  "sure", "another", "question", "answer", "ask", "say", "said", "get", "got", "let", "make",
]);

/** Phrases that mean the candidate skipped the question. */
const NON_ANSWER_MARKERS = [
  "dont know", "do not know", "no idea", "dunno", "not sure", "unsure",
  "no clue", "cant answer", "cannot answer", "skip", "pass on this",
  "next question", "another question", "repeat the question", "no comment",
];

/**
 * Returns the answer only if it says enough to guide the search.
 *
 * The answer is a third of what the search runs on, so an empty one pulls the
 * results off topic. In a real session "test test test test test" made a
 * question about software testing the top result.
 *
 * This affects the search only. The interviewer still sees every answer, and
 * `inferAnswerSignal` in prompts.ts uses a skipped one to decide whether to
 * follow up or move on.
 */
function answerWithTopicSignal(answer: string | null | undefined): string {
  if (!answer) {
    return "";
  }

  const normalized = answer.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  // Counted once each, so "test test test test test" counts as one word.
  const contentWords = new Set(
    normalized.split(" ").filter((word) => word.length > 2 && !ANSWER_STOP_WORDS.has(word))
  );

  if (contentWords.size < MIN_ANSWER_CONTENT_WORDS) {
    return "";
  }

  // A long enough sentence can still be a skip: "I don't know, could you ask me
  // a different question instead".
  if (NON_ANSWER_MARKERS.some((marker) => normalized.includes(marker))) {
    return "";
  }

  return answer;
}

/**
 * How much each piece of context steers the search.
 *
 * The job description, resume and latest answer count equally. The role title
 * counts for little: it is a generic label the role prompt files already cover,
 * and leaning on it returns whatever is broadly tagged for that role instead of
 * something specific to this candidate.
 *
 * Missing pieces are not counted, and the rest scale up to fill the gap. With no
 * job description the other three become roughly 43/43/14.
 */
const QUERY_WEIGHTS = {
  role: 0.1,
  latestAnswer: 0.3,
  jobDescription: 0.3,
  resumeText: 0.3,
} as const;

const MAX_JD_CHARS = 600;
const MAX_RESUME_CHARS = 600;
const MAX_ANSWER_CHARS = 600;

/** Score bonus for a question tagged with this interview's role. */
const ROLE_MATCH_BOOST = 0.1;
/** Size of each resume slice. Small enough that there is a real choice between
 * them, rather than the whole resume being kept. */
const RESUME_CHUNK_CHARS = 160;
/** Most slices to score per resume, so the work stays bounded. */
const MAX_RESUME_CHUNKS = 10;
/** How many slices end up representing the resume in the search. */
const RESUME_CHUNKS_KEPT = 3;
/** Two slices this similar say the same thing, so only one is kept. */
const RESUME_CHUNK_REDUNDANCY = 0.8;

/** Used to spot "City, State" addresses in a resume. */
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

/**
 * Removes the parts of a resume that say nothing about the candidate's work:
 * addresses, schools, degrees, dates and grades. Skills, projects and
 * experience stay.
 *
 * Left in, they crowd out the useful text. In one real session the search was
 * running on "New Brunswick, NJ EDUCATION Rutgers University ... GPA 3.8",
 * which ranked the education line above the list of frameworks.
 */
function stripResumeBoilerplate(text: string): string {
  return (
    text
      // Date ranges: "September 2025 - May 2027", "2021-2024", "Sept 2025 - Present"
      .replace(
        /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–—to]+\s*(?:present|current|[a-z]*\.?\s*\d{4})/gi,
        " "
      )
      .replace(/\b(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present)\b/gi, " ")
      // "GPA 3.8", "GPA: 3.8/4.0", "CGPA: 9.5/10.0"
      .replace(/\bc?gpa\s*:?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/gi, " ")
      // "Master of Science", "B.Tech", "MBA"
      .replace(/\b(?:bachelor|master|associate|doctor)(?:'?s)?\s+of\s+[a-z]+(?:\s+[a-z]+)?/gi, " ")
      .replace(/\b(?:b\.?s\.?c?|m\.?s\.?c?|b\.?tech|m\.?tech|ph\.?d|mba)\b\.?/gi, " ")
      // "Rutgers University", "University of Michigan"
      .replace(/\b[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*\s+(?:University|College|Institute|School)\b/g, " ")
      .replace(/\bUniversity\s+of\s+[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*/g, " ")
      // A postcode, and a city written just before it: "New Brunswick 08901".
      // Only whole five-digit numbers match, so "10K+" and "35%" survive.
      //
      // A city written *after* the postcode is left alone on purpose.
      // "08901 | New Brunswick" looks exactly like "08901 | React", and removing
      // it deleted "Backend" and "React" from real resumes. A stray city name is
      // a much smaller problem than losing the candidate's skills.
      .replace(
        /(?:^|(?<=[\s,(|]))(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}[\s,]+)?\d{5}(?:-\d{4})?(?=$|[\s,).|])/g,
        " "
      )
      // "New Brunswick, NJ" / "New Brunswick, New Jersey, USA". Matched against
      // the list of real place names above. Matching on shape instead
      // ("Word, Word") also matched "Redux, Next" and "Webpack, Jest", wiping
      // out the skills lists.
      .replace(
        new RegExp(
          String.raw`\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:${US_STATES.join("|")})\b(?:,\s*(?:USA|U\.S\.A?\.?|US))?`,
          "g"
        ),
        " "
      )
      .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:India|Canada|UK|United Kingdom|Australia|Germany|Singapore)\b/g, " ")
      // "(BE)", and the empty brackets left behind once a degree name is gone.
      .replace(/\(\s*(?:[A-Z]{1,5}\.?){1,3}\s*\)/g, " ")
      .replace(/\(\s*\)/g, " ")
      // "Bachelor" or "Master" left behind when the words after it did not match
      .replace(/\b(?:bachelors?|masters?)\b(?:\s+of)?/gi, " ")
      // Section headings on their own
      .replace(/\b(?:EDUCATION|COURSEWORK|CERTIFICATIONS?|AWARDS?|INTERESTS?|REFERENCES?)\b:?/g, " ")
      // Stray punctuation left by the removals above: ", . Coursework: ."
      .replace(/\s*[,;:]\s*(?=[,;:.])/g, " ")
      .replace(/\s+([,;:.])/g, "$1")
      .replace(/(?:^|\s)[-–—,;:.]+(?=\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Splits a resume into slices, so the most relevant ones can be picked later.
 *
 * Slicing beats simply taking the opening text: a resume starts with contact
 * details, address and education, which is the least useful part of it.
 */
function chunkResume(text: string): string[] {
  const cleaned = stripResumeBoilerplate(
    stripContactDetails(text).replace(/\s*\|\s*/g, " ")
  );
  const chunks: string[] = [];
  let current = "";

  // Break on spaces, never mid-word. Cutting at a fixed length once split
  // "React components" into "compone" and "nts", which mean nothing.
  for (const word of cleaned.split(" ")) {
    if (current.length + word.length + 1 > RESUME_CHUNK_CHARS && current.length > 0) {
      chunks.push(current);
      current = "";
      if (chunks.length >= MAX_RESUME_CHUNKS) {
        return chunks;
      }
    }
    current = current.length === 0 ? word : `${current} ${word}`;
  }

  if (current.length > 40) {
    chunks.push(current);
  }

  return chunks;
}

/** The separate pieces of context the search runs on. */
export interface RetrievalQueryParts {
  role: string;
  type: string;
  focusAreas: string;
  jobDescription: string;
  resumeText: string;
  latestAnswer: string;
}

/**
 * Returns each piece of context separately, so it is possible to see what the
 * search is actually running on. An empty string means that piece was missing,
 * or was removed as unusable.
 */
export function explainRetrievalQuery(session: PromptInterviewSession): RetrievalQueryParts {
  const latest = latestTranscriptEntry(session.transcript);
  const focusAreas = Array.isArray(session.focusAreas)
    ? session.focusAreas.filter((area): area is string => typeof area === "string").join(", ")
    : "";

  return {
    // Written as a sentence rather than bare labels, which the model handles
    // better.
    role: `A ${session.type} interview for a ${session.role} role${focusAreas ? `, focusing on ${focusAreas}` : ""}.`,
    type: session.type,
    focusAreas,
    jobDescription: condenseForEmbedding(session.jobDescription, MAX_JD_CHARS),
    // Cleaned the same way `chunkResume` cleans it. Otherwise the logs would
    // show resume text the search never actually used.
    resumeText: condenseForEmbedding(
      session.resumeText ? stripResumeBoilerplate(session.resumeText) : null,
      MAX_RESUME_CHARS
    ),
    // What the candidate just said is what makes the search follow the
    // conversation, but only when they actually said something.
    latestAnswer: condenseForEmbedding(answerWithTopicSignal(latest?.answer), MAX_ANSWER_CHARS),
  };
}

/** The weighted sources that make up the query vector. */
export function buildWeightedQueryParts(
  session: PromptInterviewSession
): { source: keyof typeof QUERY_WEIGHTS; text: string; weight: number }[] {
  const parts = explainRetrievalQuery(session);

  return (Object.keys(QUERY_WEIGHTS) as (keyof typeof QUERY_WEIGHTS)[])
    .map((source) => ({ source, text: parts[source], weight: QUERY_WEIGHTS[source] }))
    .filter((part) => part.text.trim().length > 0);
}

/** All the context joined into one string, for logging and empty checks. */
export function buildRetrievalQuery(session: PromptInterviewSession): string {
  return buildWeightedQueryParts(session)
    .map((part) => part.text)
    .join(" ")
    .slice(0, 2000);
}

/**
 * Blends the separate pieces of context into one, by the weights above.
 *
 * Blending keeps a long resume from drowning out a short answer, which is what
 * happens if the pieces are simply joined into one string.
 */
function combineWeighted(vectors: number[][], weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const combined = new Array<number>(vectors[0].length).fill(0);

  for (let i = 0; i < vectors.length; i++) {
    const scale = weights[i] / total;
    for (let j = 0; j < combined.length; j++) {
      combined[j] += vectors[i][j] * scale;
    }
  }

  // Scale back to unit length, so scores against the stored questions stay
  // comparable.
  const magnitude = Math.sqrt(combined.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? combined : combined.map((value) => value / magnitude);
}

interface CandidateRow {
  id: string;
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  roleTags: string[];
  similarity: number;
  embedding: string;
}

function parseVector(literal: string): number[] {
  return literal.slice(1, -1).split(",").map(Number);
}

/**
 * Questions this candidate has already been shown, so they are not shown again.
 *
 * Covers this interview and their earlier interviews for the same role, since
 * repeating questions across sessions is the problem this feature exists to
 * solve. With no session or user, the search still runs, just without skipping
 * anything.
 */
async function loadExcludedQuestionIds(
  session: PromptInterviewSession,
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"]
): Promise<string[]> {
  if (!session.id && !session.userId) {
    return [];
  }

  const rows = await prisma.retrievedQuestion.findMany({
    where: session.userId
      ? {
          interviewSession: {
            userId: session.userId,
            role: session.role,
            deletedAt: null,
          },
        }
      : { interviewSessionId: session.id as string },
    select: { questionCorpusId: true },
    orderBy: { createdAt: "desc" },
    take: PRIOR_QUESTION_LIMIT,
  });

  return [...new Set(rows.map((row) => row.questionCorpusId))];
}

/**
 * Records what was used, so later turns can skip it. A failure here only costs
 * a repeated question next turn, which is not worth ending an interview over.
 */
async function recordRetrievedQuestions(
  session: PromptInterviewSession,
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
  questionCorpusIds: string[]
): Promise<void> {
  if (!session.id || questionCorpusIds.length === 0) {
    return;
  }

  try {
    await prisma.retrievedQuestion.createMany({
      data: questionCorpusIds.map((questionCorpusId) => ({
        interviewSessionId: session.id as string,
        questionCorpusId,
        questionOrder: session.currentQuestion,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    logger.warn("Failed to record retrieved questions", {
      interviewId: session.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Picks the best questions one at a time, skipping any that repeat one already
 * picked.
 *
 * The question bank contains near-duplicates -- "What is IaC?" and "What is
 * Infrastructure as Code and its significance?" are both in it. Without this
 * they land in the same prompt and the interview asks the same thing twice.
 */
function selectWithMmr(
  candidates: { row: CandidateRow; vector: number[] }[],
  limit: number,
  cosineSimilarity: (a: number[], b: number[]) => number
): CandidateRow[] {
  const selected: { row: CandidateRow; vector: number[] }[] = [];

  while (selected.length < limit && candidates.length > 0) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const maxSimilarityToSelected = selected.reduce(
        (max, chosen) => Math.max(max, cosineSimilarity(candidate.vector, chosen.vector)),
        0
      );

      if (maxSimilarityToSelected >= REDUNDANCY_THRESHOLD) {
        continue;
      }

      const score = MMR_LAMBDA * candidate.row.similarity - (1 - MMR_LAMBDA) * maxSimilarityToSelected;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      break;
    }

    selected.push(candidates[bestIndex]);
    candidates.splice(bestIndex, 1);
  }

  return selected.map((entry) => entry.row);
}

async function retrieve(
  session: PromptInterviewSession,
  limit: number
): Promise<RetrievedQuestion[]> {
  const query = buildRetrievalQuery(session);
  if (!query) {
    return [];
  }

  const startedAt = Date.now();
  const { prisma, localEmbedder, toVectorLiteral, cosineSimilarity } = await loadDeps();
  // This small database read and the local embedding inference have no data
  // dependency on one another. Starting both together avoids adding the query
  // latency to every live-interview turn, especially while the model is cold.
  const excludedIdsPromise = loadExcludedQuestionIds(session, prisma);
  const parts = explainRetrievalQuery(session);
  const weightedParts = buildWeightedQueryParts(session);

  // Resume slices go through the model together with the other context, then
  // get scored below so only the relevant parts of the resume are used.
  const resumeChunks = session.resumeText ? chunkResume(session.resumeText) : [];
  const nonResumeParts = weightedParts.filter((part) => part.source !== "resumeText");

  const embedStartedAt = Date.now();
  const embeddingPromise = localEmbedder
    .embed([
      ...nonResumeParts.map((part) => part.text),
      ...resumeChunks,
    ])
    .then((vectors) => ({ vectors, elapsedMs: Date.now() - embedStartedAt }));
  const [{ vectors, elapsedMs: embedMs }, excludedIds] = await Promise.all([
    embeddingPromise,
    excludedIdsPromise,
  ]);

  const nonResumeVectors = vectors.slice(0, nonResumeParts.length);
  const resumeChunkVectors = vectors.slice(
    nonResumeParts.length,
    nonResumeParts.length + resumeChunks.length
  );

  const queryTexts = [...nonResumeParts.map((part) => part.text)];
  const queryVectors = [...nonResumeVectors];
  const queryWeights = [...nonResumeParts.map((part) => part.weight)];

  let rankedResumeChunks: { text: string; score: number; selected: boolean }[] = [];

  if (resumeChunkVectors.length > 0) {
    // Score the slices against all the other context -- the role, the job
    // description, and above all the latest answer.
    //
    // Scoring against the role alone had two problems. It favoured slices
    // written as sentences over lists of skills, so one session picked
    // "achieving up to 90% reduction in redundant code" over "TypeScript,
    // MongoDB, Node.js, AWS, Docker". And since the role never changes, it
    // picked the same slices every turn. Including the answer lets the resume
    // follow the conversation.
    const contextVector = combineWeighted(
      nonResumeVectors,
      nonResumeParts.map((part) => part.weight)
    );

    const scored = resumeChunkVectors
      .map((vector, index) => ({
        vector,
        text: resumeChunks[index],
        score: cosineSimilarity(contextVector, vector),
      }))
      .sort((a, b) => b.score - a.score);

    // Neighbouring slices from the same job often say much the same thing.
    // Take the best one, then only slices that add something new, so the
    // selection covers the resume instead of one job.
    const ranked: typeof scored = [];
    for (const chunk of scored) {
      if (ranked.length >= RESUME_CHUNKS_KEPT) {
        break;
      }
      const redundant = ranked.some(
        (kept) => cosineSimilarity(kept.vector, chunk.vector) >= RESUME_CHUNK_REDUNDANCY
      );
      if (!redundant) {
        ranked.push(chunk);
      }
    }

    const keptTexts = new Set(ranked.map((chunk) => chunk.text));
    rankedResumeChunks = scored.map((chunk) => ({
      text: chunk.text,
      score: chunk.score,
      selected: keptTexts.has(chunk.text),
    }));

    queryTexts.push(ranked.map((chunk) => chunk.text).join(" "));
    queryVectors.push(combineWeighted(ranked.map((chunk) => chunk.vector), ranked.map(() => 1)));
    queryWeights.push(QUERY_WEIGHTS.resumeText);
  }

  const queryVector = combineWeighted(queryVectors, queryWeights);

  // A matching role adds to the score rather than filtering the rest out.
  // Filtering would drop the behavioural questions, which suit any role, along
  // with anything relevant that simply was not tagged. The bonus is enough to
  // stop a back-end question topping a front-end interview.
  const roleSlug = normalizeRoleSlug(session.role);
  const queryStartedAt = Date.now();
  const rows = await prisma.$queryRaw<CandidateRow[]>`
    SELECT "id", "question", "answer", "category", "difficulty", "roleTags",
           (1 - ("embedding" <=> ${toVectorLiteral(queryVector)}::vector))
             + CASE WHEN ${roleSlug} = ANY("roleTags")
                    THEN ${ROLE_MATCH_BOOST}::double precision ELSE 0 END
             AS similarity,
           "embedding"::text AS embedding
    FROM "QuestionCorpus"
    WHERE "embedding" IS NOT NULL
      AND ("types" && ${[session.type]}::text[] OR cardinality("types") = 0)
    ORDER BY similarity DESC
    LIMIT ${CANDIDATE_POOL}
  `;

  const queryMs = Date.now() - queryStartedAt;

  // Record why each question was dropped, so a short or empty result can be
  // traced to the step that caused it.
  const rejections = new Map<string, "similarity_floor" | "already_retrieved">();
  const excluded = new Set(excludedIds);
  const fresh: { row: CandidateRow; vector: number[] }[] = [];
  const seen: { row: CandidateRow; vector: number[] }[] = [];

  for (const row of rows) {
    if (row.similarity < MIN_SIMILARITY) {
      rejections.set(row.question, "similarity_floor");
      continue;
    }
    const candidate = { row, vector: parseVector(row.embedding) };
    if (excluded.has(row.id)) {
      rejections.set(row.question, "already_retrieved");
      seen.push(candidate);
    } else {
      fresh.push(candidate);
    }
  }

  const survivedCount = fresh.length;

  // Unseen questions first. Some interview types have very few questions -- the
  // hiring-manager set has ten -- so once those run out, fall back to ones
  // already shown. Returning nothing would look exactly like a broken search.
  const chosen = selectWithMmr([...fresh], limit, cosineSimilarity);
  let backfilledCount = 0;
  if (chosen.length < limit && seen.length > 0) {
    const backfill = selectWithMmr([...seen], limit - chosen.length, cosineSimilarity);
    backfilledCount = backfill.length;
    for (const row of backfill) {
      rejections.delete(row.question);
      chosen.push(row);
    }
  }

  const selected = chosen.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    difficulty: row.difficulty,
    similarity: row.similarity,
  }));

  await recordRetrievedQuestions(session, prisma, selected.map((entry) => entry.id));

  if (ragTracePath()) {
    const selectedQuestions = new Set(selected.map((entry) => entry.question));
    const weightTotal = queryWeights.reduce((sum, weight) => sum + weight, 0);

    // Not waited on: logging must not slow down a turn.
    void writeRagTrace({
      timestamp: new Date().toISOString(),
      session: {
        role: session.role,
        roleSlug,
        type: session.type,
        difficulty: session.difficulty ?? null,
        company: session.company ?? null,
        currentQuestion: session.currentQuestion,
        questionCount: session.questionCount,
      },
      query: {
        parts: queryTexts.map((text, index) => ({
          source:
            index < nonResumeParts.length ? nonResumeParts[index].source : "resumeText(selected)",
          weight: queryWeights[index],
          // The weight after scaling up for any missing context: with no job
          // description, everything else counts for more.
          effectiveWeight: Number((queryWeights[index] / weightTotal).toFixed(4)),
          text,
        })),
        omitted: (Object.keys(QUERY_WEIGHTS) as (keyof typeof QUERY_WEIGHTS)[]).filter(
          (source) => !parts[source]?.trim()
        ),
      },
      resume:
        rankedResumeChunks.length > 0
          ? {
              chunksConsidered: rankedResumeChunks.length,
              chunkScores: rankedResumeChunks.map((chunk) => ({
                score: Number(chunk.score.toFixed(4)),
                selected: chunk.selected,
                text: chunk.text,
              })),
            }
          : null,
      exclusion: { excludedIdCount: excludedIds.length, backfilledFromSeen: backfilledCount },
      candidates: {
        fromDatabase: rows.length,
        survived: survivedCount,
        all: rows.map((row) => ({
          question: row.question,
          category: row.category,
          similarity: Number(row.similarity.toFixed(4)),
          roleMatched: row.roleTags.includes(roleSlug),
          rejectedBy: selectedQuestions.has(row.question)
            ? null
            : (rejections.get(row.question) ?? "not_selected"),
        })),
      },
      returned: selected.map((entry) => ({
        question: entry.question,
        category: entry.category,
        similarity: Number(entry.similarity.toFixed(4)),
        hasReferenceAnswer: Boolean(entry.answer),
      })),
      timings: { embedMs, queryMs, totalMs: Date.now() - startedAt },
      config: {
        roleMatchBoost: ROLE_MATCH_BOOST,
        minSimilarity: MIN_SIMILARITY,
        mmrLambda: MMR_LAMBDA,
        redundancyThreshold: REDUNDANCY_THRESHOLD,
        candidatePool: CANDIDATE_POOL,
        limit,
        weightRole: QUERY_WEIGHTS.role,
        weightLatestAnswer: QUERY_WEIGHTS.latestAnswer,
        weightJobDescription: QUERY_WEIGHTS.jobDescription,
        weightResumeText: QUERY_WEIGHTS.resumeText,
      },
    });
  }

  return selected;
}

/**
 * Switch to turn the whole feature off, and the reason unit tests never load the
 * 97MB model. Off in tests unless asked for, on everywhere else unless disabled.
 */
export function isQuestionRetrievalEnabled(): boolean {
  const flag = process.env.RAG_RETRIEVAL_ENABLED;
  if (flag != null) {
    return flag === "true" || flag === "1";
  }
  return process.env.NODE_ENV !== "test";
}

/**
 * Never fails a turn. This runs while the candidate waits, so if the search is
 * slow or errors, it returns nothing and the interview carries on without it.
 * A stalled interview is worse than a repetitive one.
 */
export async function retrieveQuestionsForSession(
  session: PromptInterviewSession,
  limit: number = DEFAULT_LIMIT
): Promise<RetrievedQuestion[]> {
  if (!isQuestionRetrievalEnabled()) {
    return [];
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      retrieve(session, limit),
      new Promise<RetrievedQuestion[]>((resolve) => {
        timeoutId = setTimeout(() => resolve([]), RETRIEVAL_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    logger.warn("Question retrieval failed; continuing without corpus", {
      role: session.role,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Formats the questions for the interviewer's prompt.
 *
 * They are offered as a guide, not a script. The stored wording is repetitive --
 * 22 of the 174 technical questions open with "What is a ..." -- so reading them
 * out would undo the tailoring to this candidate's resume and job description,
 * and would ask every candidate the same thing.
 */
export function formatRetrievedQuestions(questions: RetrievedQuestion[]): string {
  if (questions.length === 0) {
    return "";
  }

  const lines = questions.map((entry, index) => {
    const parts = [`${index + 1}. [${entry.category}] ${entry.question}`];
    if (entry.answer) {
      parts.push(`   Reference answer: ${entry.answer}`);
    }
    return parts.join("\n");
  });

  return [
    "## RETRIEVED REFERENCE QUESTIONS (internal - never show or quote this list)",
    "Topic and depth calibration for this stage of the interview.",
    "Adapt them to this candidate's background and the conversation so far.",
    "Do not read them out verbatim, and do not work through them in order.",
    "Where a reference answer is given, use it to judge the candidate's response,",
    "not to script your own.",
    "",
    ...lines,
  ].join("\n");
}
