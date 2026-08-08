import type { PromptInterviewSession } from "@/lib/interview/domain";
import { normalizeRoleSlug } from "@/lib/rag/taxonomy";
import { ragTracePath, writeRagTrace } from "@/lib/rag/trace";
import { logger } from "@/utils/logger";

// Prisma and the embedder are imported lazily, inside the retrieval path only.
// `prompts.ts` is on every interview turn and is imported by tests that never
// retrieve anything; pulling the generated Prisma client and the embedding
// machinery in at module scope would load both for no reason.
async function loadDeps() {
  const [{ prisma }, embeddings] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/rag/embeddings"),
  ]);
  return { prisma, ...embeddings };
}

export interface RetrievedQuestion {
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  similarity: number;
}

/** How many questions end up in the prompt. */
const DEFAULT_LIMIT = 6;
/** Candidates pulled from Postgres before exclusion and MMR narrow them down. */
const CANDIDATE_POOL = 32;
/** Above this cosine, two questions are treated as the same question. */
const REDUNDANCY_THRESHOLD = 0.85;
/** Weights relevance against novelty in MMR. 1.0 = pure relevance. */
const MMR_LAMBDA = 0.75;
/**
 * Candidates below this similarity are dropped even if it means returning fewer
 * than `limit`. Without a floor, MMR keeps reaching down the ranking for novelty
 * and pads the prompt with off-topic questions -- a React session was pulling in
 * "Define encapsulation" at 0.126. Few good questions beat six padded ones.
 * MiniLM cosine values are compressed, so this reads lower than it looks.
 */
const MIN_SIMILARITY = 0.2;
/** Prior-session questions to consider. Caps the per-turn embedding cost. */
const PRIOR_QUESTION_LIMIT = 60;
/** Retrieval never delays a turn by more than this. */
const RETRIEVAL_TIMEOUT_MS = 2500;

/**
 * Removes contact details before anything is embedded.
 *
 * Two reasons. Retrieval quality: a candidate's name and email are pure noise as
 * topic terms -- "joy shah" was previously being embedded as a search signal.
 * And privacy: there is no reason to push personal identifiers through the
 * embedding path at all.
 */
function stripContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\b(?:linkedin|github)\.com\/\S+/gi, " ")
    // A leading "Firstname Lastname" line, which is how most resumes open.
    .replace(/^\s*[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}\s*[.,\n]/, " ");
}

/**
 * Prepares free text for embedding.
 *
 * Deliberately keeps natural sentences rather than reducing to keywords. The
 * embedding model is a sentence transformer: it was trained on prose, and a bag
 * of keywords is out-of-distribution input for it. The previous keyword approach
 * also had a subtle defect -- resume terms nearly all occur exactly once, so
 * ranking by frequency collapsed to the alphabetical tie-break and the top-N cut
 * kept whichever terms happened to start with early letters.
 */
function condenseForEmbedding(text: string | null | undefined, maxChars: number): string {
  if (!text) {
    return "";
  }

  const cleaned = stripContactDetails(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  // Prefer cutting at a sentence boundary so the model sees complete clauses.
  const truncated = cleaned.slice(0, maxChars);
  const lastBreak = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("; "));
  return lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak + 1) : truncated;
}

/**
 * Relative influence of each source on the query vector.
 *
 * The three context sources -- job description, resume and the latest answer --
 * carry equal weight, with the role title deliberately weak: it is a generic
 * label the role packs already handle, and leaning on it pulls retrieval towards
 * whatever is broadly tagged for that role rather than towards this candidate.
 *
 * Weights are normalized over whichever sources are present, so absent ones do
 * not silently shrink the rest. With no job description, the remaining three
 * renormalize to roughly 43/43/14.
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

/** Added to similarity when a question is tagged for the interview's role. */
const ROLE_MATCH_BOOST = 0.1;
/** Size of the resume slices scored for relevance. Small enough that selection
 * has genuine choices to make rather than keeping everything. */
const RESUME_CHUNK_CHARS = 160;
/** Chunks scored per resume. Caps the embedding cost. */
const MAX_RESUME_CHUNKS = 10;
/** Chunks kept and averaged into the resume vector. */
const RESUME_CHUNKS_KEPT = 2;

/** State names and postal codes, used to recognise "City, State" locations. */
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
 * Removes resume boilerplate that carries no technical signal.
 *
 * Real traces showed the query embedding "New Brunswick, NJ | | | EDUCATION
 * Rutgers University - New Brunswick, New Jersey, USA September 2025 - May 2027
 * ... GPA 3.8". None of that says anything about what the candidate can build,
 * but it takes up room in the query vector and pulled the education chunk above
 * the skills chunk. Locations, institutions, dates and grades go; skills,
 * projects and experience stay.
 */
function stripResumeBoilerplate(text: string): string {
  return (
    text
      // "September 2025 - May 2027", "2021-2024", "Sept 2025 – Present"
      .replace(
        /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–—to]+\s*(?:present|current|[a-z]*\.?\s*\d{4})/gi,
        " "
      )
      .replace(/\b(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present)\b/gi, " ")
      // "GPA 3.8", "GPA: 3.8/4.0", "CGPA: 9.5/10.0"
      .replace(/\bc?gpa\s*:?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/gi, " ")
      // Degree titles
      .replace(/\b(?:bachelor|master|associate|doctor)(?:'?s)?\s+of\s+[a-z]+(?:\s+[a-z]+)?/gi, " ")
      .replace(/\b(?:b\.?s\.?c?|m\.?s\.?c?|b\.?tech|m\.?tech|ph\.?d|mba)\b\.?/gi, " ")
      // Institutions
      .replace(/\b[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*\s+(?:University|College|Institute|School)\b/g, " ")
      .replace(/\bUniversity\s+of\s+[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*/g, " ")
      // "New Brunswick, NJ" / "New Brunswick, New Jersey, USA".
      // Matched against real place names only. A shape-based pattern
      // ("Word, Word") also matched "Redux, Next" and "Webpack, Jest" and
      // destroyed comma-separated skill lists -- the most useful part of a resume.
      .replace(
        new RegExp(
          String.raw`\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:${US_STATES.join("|")})\b(?:,\s*(?:USA|U\.S\.A?\.?|US))?`,
          "g"
        ),
        " "
      )
      .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:India|Canada|UK|United Kingdom|Australia|Germany|Singapore)\b/g, " ")
      // Degree abbreviations in parentheses, and the empty parens left behind
      // once a degree title has been removed: "( ) in Computer Science".
      .replace(/\(\s*(?:[A-Z]{1,5}\.?){1,3}\s*\)/g, " ")
      .replace(/\(\s*\)/g, " ")
      // "Bachelor"/"Master" left stranded when the following words did not match
      .replace(/\b(?:bachelors?|masters?)\b(?:\s+of)?/gi, " ")
      // Standalone section headings
      .replace(/\b(?:EDUCATION|COURSEWORK|CERTIFICATIONS?|AWARDS?|INTERESTS?|REFERENCES?)\b:?/g, " ")
      // Punctuation orphaned by the removals above (", . Coursework: .")
      .replace(/\s*[,;:]\s*(?=[,;:.])/g, " ")
      .replace(/\s+([,;:.])/g, "$1")
      .replace(/(?:^|\s)[-–—,;:.]+(?=\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Splits a resume into candidate slices for relevance scoring.
 *
 * A parsed PDF resume opens with contact details, address and education, so
 * taking the leading N characters is close to the worst possible selection.
 */
function chunkResume(text: string): string[] {
  const cleaned = stripResumeBoilerplate(
    stripContactDetails(text).replace(/\s*\|\s*/g, " ")
  );
  const chunks: string[] = [];
  let current = "";

  // Accumulate whole words: slicing on a fixed character count split "React
  // components" into "compone" + "nts", and those fragments are meaningless to
  // the tokenizer.
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

/**
 * Builds the retrieval query for this turn.
 *
 * Deliberately not just the role: a role-only query returns the same k questions
 * in every session, which is the repetition problem rather than a fix for it.
 * Because the stage and the candidate's latest answer are part of the query, the
 * vector moves through the interview and retrieval follows the conversation.
 */
export interface RetrievalQueryParts {
  role: string;
  type: string;
  focusAreas: string;
  jobDescription: string;
  resumeText: string;
  latestAnswer: string;
}

/**
 * Exposes each contributing source separately so it is possible to see what the
 * query is actually made of -- in particular whether the resume and job
 * description contributed anything, or were absent/filtered to nothing.
 */
export function explainRetrievalQuery(session: PromptInterviewSession): RetrievalQueryParts {
  const latest = Array.isArray(session.transcript) ? session.transcript[0] : null;
  const focusAreas = Array.isArray(session.focusAreas)
    ? session.focusAreas.filter((area): area is string => typeof area === "string").join(", ")
    : "";

  return {
    // Phrased as a sentence rather than bare labels, for the same
    // sentence-transformer reason as above.
    role: `A ${session.type} interview for a ${session.role} role${focusAreas ? `, focusing on ${focusAreas}` : ""}.`,
    type: session.type,
    focusAreas,
    jobDescription: condenseForEmbedding(session.jobDescription, MAX_JD_CHARS),
    // Boilerplate-stripped, matching what `chunkResume` actually embeds. Without
    // this the traces and preview showed raw resume text that differed from the
    // text the query was really built from.
    resumeText: condenseForEmbedding(
      session.resumeText ? stripResumeBoilerplate(session.resumeText) : null,
      MAX_RESUME_CHARS
    ),
    // The candidate's own words are the adaptive part of the query.
    latestAnswer: condenseForEmbedding(latest?.answer, MAX_ANSWER_CHARS),
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

/** Flattened form, kept for logging and emptiness checks. */
export function buildRetrievalQuery(session: PromptInterviewSession): string {
  return buildWeightedQueryParts(session)
    .map((part) => part.text)
    .join(" ")
    .slice(0, 2000);
}

/**
 * Embeds each source separately and combines them into one weighted vector.
 *
 * Costs one embedding call for up to four short texts (~10ms, no LLM tokens),
 * and keeps a long resume from dominating the direction of the query.
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

  // Re-normalize so the result stays comparable to the L2-normalized corpus
  // vectors, keeping the dot product a true cosine similarity.
  const magnitude = Math.sqrt(combined.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? combined : combined.map((value) => value / magnitude);
}

interface CandidateRow {
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

/** Questions this user has already been asked, most recent first. */
async function loadAskedQuestions(
  session: PromptInterviewSession,
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"]
): Promise<string[]> {
  const sessionLocal = (session.transcript ?? []).map((entry) => entry.question).filter(Boolean);

  if (!session.userId) {
    return sessionLocal;
  }

  const prior = await prisma.transcriptEntry.findMany({
    where: {
      interviewSession: {
        userId: session.userId,
        role: session.role,
        deletedAt: null,
      },
    },
    select: { question: true },
    orderBy: { createdAt: "desc" },
    take: PRIOR_QUESTION_LIMIT,
  });

  return [...new Set([...sessionLocal, ...prior.map((entry) => entry.question)])];
}

/**
 * Maximal marginal relevance: greedily pick the most relevant candidate that is
 * not already represented in the selection. Without this, the corpus's own
 * near-duplicates ("What is IaC?" / "What is Infrastructure as Code and its
 * significance?") land in the same prompt and the interview repeats itself
 * inside a single session.
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
  const asked = await loadAskedQuestions(session, prisma);
  const parts = explainRetrievalQuery(session);
  const weightedParts = buildWeightedQueryParts(session);

  // One batched call: every query source, plus every already-asked question.
  // Exclusion has to be by similarity, not string equality -- the model
  // rephrases corpus questions rather than reading them out, so exact matching
  // would never fire.
  // Resume chunks are embedded alongside everything else, then scored against
  // the role vector so only the genuinely relevant parts of the resume reach
  // the query.
  const resumeChunks = session.resumeText ? chunkResume(session.resumeText) : [];
  const nonResumeParts = weightedParts.filter((part) => part.source !== "resumeText");

  const embedStartedAt = Date.now();
  const vectors = await localEmbedder.embed([
    ...nonResumeParts.map((part) => part.text),
    ...resumeChunks,
    ...asked,
  ]);
  const embedMs = Date.now() - embedStartedAt;

  const nonResumeVectors = vectors.slice(0, nonResumeParts.length);
  const resumeChunkVectors = vectors.slice(
    nonResumeParts.length,
    nonResumeParts.length + resumeChunks.length
  );
  const askedVectors = vectors.slice(nonResumeParts.length + resumeChunks.length);

  const queryTexts = [...nonResumeParts.map((part) => part.text)];
  const queryVectors = [...nonResumeVectors];
  const queryWeights = [...nonResumeParts.map((part) => part.weight)];

  let rankedResumeChunks: { text: string; score: number; selected: boolean }[] = [];

  if (resumeChunkVectors.length > 0) {
    const roleIndex = nonResumeParts.findIndex((part) => part.source === "role");
    const roleVector = roleIndex >= 0 ? nonResumeVectors[roleIndex] : null;

    const scored = resumeChunkVectors
      .map((vector, index) => ({
        vector,
        text: resumeChunks[index],
        score: roleVector ? cosineSimilarity(roleVector, vector) : 0,
      }))
      .sort((a, b) => b.score - a.score);

    const ranked = scored.slice(0, RESUME_CHUNKS_KEPT);
    rankedResumeChunks = scored.map((chunk, index) => ({
      text: chunk.text,
      score: chunk.score,
      selected: index < RESUME_CHUNKS_KEPT,
    }));

    queryTexts.push(ranked.map((chunk) => chunk.text).join(" "));
    queryVectors.push(combineWeighted(ranked.map((chunk) => chunk.vector), ranked.map(() => 1)));
    queryWeights.push(QUERY_WEIGHTS.resumeText);
  }

  const queryVector = combineWeighted(queryVectors, queryWeights);

  // Role is a boost, not a filter. Filtering would discard the role-agnostic
  // behavioural questions entirely and, on a corpus this small, throw away
  // relevant material that simply was not tagged for this role. The boost is
  // enough to stop a back-end question topping a front-end interview.
  const roleSlug = normalizeRoleSlug(session.role);
  const queryStartedAt = Date.now();
  const rows = await prisma.$queryRaw<CandidateRow[]>`
    SELECT "question", "answer", "category", "difficulty", "roleTags",
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

  // Track why each candidate was dropped, so a thin or empty result set can be
  // attributed to a specific stage rather than guessed at.
  const rejections = new Map<string, "similarity_floor" | "already_asked">();
  const candidates: { row: CandidateRow; vector: number[] }[] = [];

  for (const row of rows) {
    if (row.similarity < MIN_SIMILARITY) {
      rejections.set(row.question, "similarity_floor");
      continue;
    }
    const vector = parseVector(row.embedding);
    const wasAsked = askedVectors.some(
      (askedVector) => cosineSimilarity(vector, askedVector) >= REDUNDANCY_THRESHOLD
    );
    if (wasAsked) {
      rejections.set(row.question, "already_asked");
      continue;
    }
    candidates.push({ row, vector });
  }

  const survivedCount = candidates.length;

  const selected = selectWithMmr([...candidates], limit, cosineSimilarity).map((row) => ({
    question: row.question,
    answer: row.answer,
    category: row.category,
    difficulty: row.difficulty,
    similarity: row.similarity,
  }));

  if (ragTracePath()) {
    const selectedQuestions = new Set(selected.map((entry) => entry.question));
    const weightTotal = queryWeights.reduce((sum, weight) => sum + weight, 0);

    // Not awaited: tracing is diagnostic and must not add latency to a turn.
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
          // What the weight actually came to once normalized over the sources
          // that were present -- an absent JD raises everything else.
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
      exclusion: { alreadyAskedCount: asked.length, alreadyAsked: asked },
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
 * Kill switch, and the reason unit tests do not load a 97MB embedding model.
 * Off in tests unless asked for; on everywhere else unless disabled.
 * Reads process.env directly rather than extending `src/lib/env.ts`, which the
 * backend lane owns.
 */
export function isQuestionRetrievalEnabled(): boolean {
  const flag = process.env.RAG_RETRIEVAL_ENABLED;
  if (flag != null) {
    return flag === "true" || flag === "1";
  }
  return process.env.NODE_ENV !== "test";
}

/**
 * Retrieval is best-effort by design. It sits on the per-turn hot path, so a
 * slow or failing corpus query returns nothing and the interview proceeds on the
 * base prompt. A stalled interview is worse than a repetitive one.
 */
export async function retrieveQuestionsForSession(
  session: PromptInterviewSession,
  limit: number = DEFAULT_LIMIT
): Promise<RetrievedQuestion[]> {
  if (!isQuestionRetrievalEnabled()) {
    return [];
  }

  try {
    return await Promise.race([
      retrieve(session, limit),
      new Promise<RetrievedQuestion[]>((resolve) =>
        setTimeout(() => resolve([]), RETRIEVAL_TIMEOUT_MS)
      ),
    ]);
  } catch (error) {
    logger.warn("Question retrieval failed; continuing without corpus", {
      role: session.role,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Renders retrieved questions for the system prompt.
 *
 * Framed as calibration rather than a script on purpose. The corpus phrasing is
 * formulaic ("What is a ..." opens 22 of 174 software questions), so quoting it
 * verbatim would both flatten the resume/JD personalisation the prompt already
 * does and reintroduce repetition across different candidates.
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
