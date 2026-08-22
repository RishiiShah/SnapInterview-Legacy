import { latestTranscriptEntry, recentTranscriptEntries, type PromptInterviewSession } from "@/lib/interview/domain";
import type { SemanticChunk } from "@/lib/rag/chunker";

/** Different meaningful words an answer needs before it counts as an answer. */
export const MIN_ANSWER_CONTENT_WORDS = 4;

export const ANSWER_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had", "was", "were",
  "you", "your", "will", "are", "not", "but", "all", "can", "could", "would", "should", "did",
  "its", "our", "their", "them", "then", "there", "here", "what", "when", "which", "who",
  "how", "why", "some", "just", "like", "really", "very", "much", "more", "also", "about",
  "yeah", "yes", "okay", "well", "basically", "actually", "maybe", "think", "guess", "know",
  "sure", "another", "question", "answer", "ask", "say", "said", "get", "got", "let", "make",
  // Spoken conversational fillers & ASR artifacts
  "um", "uh", "ah", "er", "like", "you know", "sort of", "kind of", "so yeah", "i mean",
  "honestly", "right", "literally", "totally", "definitely", "probably", "pretty much",
]);

/**
 * Phrases that indicate the candidate is not answering the question.
 *
 * IMPORTANT: These markers intentionally use apostrophe-stripped forms
 * (e.g. "havent" not "haven't", "dont" not "don't") because
 * `answerWithTopicSignal` normalises the answer text by stripping all
 * apostrophe characters before checking these markers.
 * If you add a new marker, strip apostrophes in the literal you add here.
 */
export const NON_ANSWER_MARKERS = [
  "dont know", "do not know", "no idea", "dunno", "not sure", "unsure",
  "no clue", "cant answer", "cannot answer", "skip", "pass on this",
  "next question", "another question", "repeat the question", "no comment",
  "havent worked", "have not worked", "never used", "not familiar",
  "ive never", "didnt work", "couldnt answer",
];


export const QUERY_WEIGHTS = {
  role: 0.10,
  focusAreas: 0.10,
  latestAnswer: 0.26,
  latestQuestion: 0.12,
  activePillar: 0.12,
  jobDescription: 0.10,
  resumeText: 0.10,
  companySignals: 0.06,
  levelHint: 0.04,
} as const;

export type QueryWeightSource = keyof typeof QUERY_WEIGHTS;

export const MAX_JD_CHARS = 600;
export const MAX_RESUME_CHARS = 600;
export const MAX_ANSWER_CHARS = 600;
export const MAX_QUESTION_CHARS = 300;
export const MAX_COMPANY_SIGNAL_CHARS = 280;
/** Cap for prior-turn text inside the dense query (keeps last-2 memory light). */
export const MAX_PRIOR_TURN_CHARS = 220;
/** How many recent Q/A turns feed the conversational dense/sparse query. */
export const RECENT_DIALOGUE_TURNS = 2;

export interface RetrievalQueryParts {
  role: string;
  type: string;
  focusAreas: string;
  jobDescription: string;
  resumeText: string;
  latestQuestion: string;
  latestAnswer: string;
  activePillar: string;
  companySignals: string;
  levelHint: string;
}

export interface RetrievalQueryExtras {
  companySignals?: string;
}

/**
 * Removes names, emails, phone numbers and links from raw text.
 */
export function stripContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\b(?:linkedin|github)\.com\/\S+/gi, " ")
    .replace(/^\s*[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}\s*[.,\n]/, " ");
}

/**
 * Strips leading conversational filler words and stutter prefixes from transcript text.
 * Internal filler words ("I, um, implemented...") are intentionally preserved to
 * avoid destroying sentence meaning — only the start-of-utterance artifacts are removed.
 */
export function cleanSpokenTranscript(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text.replace(/^(?:(?:um|uh|ah|er|yeah|so\s+yeah|so|well|like|you\s+know|honestly|basically|right|okay)\s*[,.-]*\s*)+/i, "");
  cleaned = stripContactDetails(cleaned).replace(/\s+/g, " ").trim();
  return cleaned;
}

/**
 * Trims text down to a size suitable for embedding, keeping whole sentences where possible.
 */
export function condenseForEmbedding(text: string | null | undefined, maxChars: number): string {
  if (!text) return "";

  const cleaned = cleanSpokenTranscript(text);
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxChars);
  const lastBreak = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("; "));
  return lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak + 1) : truncated;
}

/**
 * Returns the answer only if it says enough to guide the search.
 * Handles spoken conversational fragments and non-answers.
 */
export function answerWithTopicSignal(answer: string | null | undefined): string {
  if (!answer) return "";

  const normalized = answer
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const contentWords = new Set(
    normalized.split(" ").filter((word) => word.length > 2 && !ANSWER_STOP_WORDS.has(word))
  );

  if (contentWords.size < MIN_ANSWER_CONTENT_WORDS) return "";

  if (NON_ANSWER_MARKERS.some((marker) => normalized.includes(marker))) {
    return "";
  }

  return cleanSpokenTranscript(answer);
}

/**
 * Derives the active agenda pillar from structured sessionPlan / brief if present.
 */
export function extractActiveAgendaPillar(
  sessionPlan: unknown,
  currentQuestion = 0,
  startedAt?: Date | string | null,
  durationMinutes?: number | null
): string {
  if (!sessionPlan || typeof sessionPlan !== "object") {
    return "";
  }

  type RawPillar = { id?: unknown; title?: unknown; targetMinutes?: unknown };

  function isRawPillarArray(val: unknown): val is RawPillar[] {
    return Array.isArray(val) && val.every((p) => typeof p === "object" && p !== null);
  }

  let pillars: RawPillar[] | null = null;

  const sp = sessionPlan as Record<string, unknown>;
  const brief = sp.brief;
  if (brief && typeof brief === "object") {
    const agenda = (brief as Record<string, unknown>).agenda;
    if (agenda && typeof agenda === "object") {
      const candidates = (agenda as Record<string, unknown>).pillars;
      if (isRawPillarArray(candidates)) pillars = candidates;
    }
  } else {
    const agenda = sp.agenda;
    if (agenda && typeof agenda === "object") {
      const candidates = (agenda as Record<string, unknown>).pillars;
      if (isRawPillarArray(candidates)) pillars = candidates;
    }
  }

  if (!pillars || pillars.length === 0) {
    return "";
  }

  // If the interview has started, align the active pillar by elapsed time.
  // durationMinutes is NOT required — we only need startedAt to compute elapsed minutes.
  if (startedAt) {
    const startedMs = new Date(startedAt).getTime();
    if (!Number.isNaN(startedMs)) {
      const elapsedMinutes = Math.max(0, (Date.now() - startedMs) / 60000);
      let accumulatedMinutes = 0;

      for (const pillar of pillars) {
        const mins = typeof pillar.targetMinutes === "number" ? pillar.targetMinutes : 10;
        accumulatedMinutes += mins;
        if (elapsedMinutes <= accumulatedMinutes && typeof pillar.title === "string" && pillar.title) {
          return pillar.title.trim();
        }
      }
      // Elapsed past all pillars — return the last one
      const lastTitle = pillars[pillars.length - 1]?.title;
      if (typeof lastTitle === "string" && lastTitle) return lastTitle.trim();
    }
  }

  // Fallback: align by question index.
  // Every 3 questions advances one pillar — this matches a typical 9-12 question
  // session with 3 pillars (3 questions each). Clamp to the last available pillar.
  const pillarIdx = Math.min(Math.floor(currentQuestion / 3), pillars.length - 1);
  const title = pillars[pillarIdx]?.title ?? pillars[0]?.title;
  return typeof title === "string" ? title.trim() : "";
}


/**
 * Derives a candidate level hint from sessionPlan brief profile, else difficulty.
 */
export function extractSessionLevelHint(session: PromptInterviewSession): string {
  const fromPlan = extractProfileLevel(session.sessionPlan);
  if (fromPlan) {
    return `Target candidate level: ${fromPlan}`;
  }

  const difficulty = session.difficulty?.trim().toLowerCase();
  if (!difficulty) return "";
  if (difficulty === "easy") return "Target candidate level: entry-level";
  if (difficulty === "hard") return "Target candidate level: senior";
  return "Target candidate level: mid-level";
}

/**
 * Reads profile.level from sessionPlan / brief when present.
 */
export function extractProfileLevel(sessionPlan: unknown): string {
  if (!sessionPlan || typeof sessionPlan !== "object") return "";

  const sp = sessionPlan as Record<string, unknown>;
  const brief = sp.brief && typeof sp.brief === "object" ? (sp.brief as Record<string, unknown>) : sp;
  const profile = brief.profile;
  if (!profile || typeof profile !== "object") return "";
  const level = (profile as Record<string, unknown>).level;
  return typeof level === "string" ? level.trim() : "";
}

/**
 * Stage-aware query weight multipliers: opening leans on role/JD/resume; mid turns lean on dialogue.
 */
export function resolveQueryWeights(
  session: PromptInterviewSession
): Record<QueryWeightSource, number> {
  const weights: Record<QueryWeightSource, number> = { ...QUERY_WEIGHTS };
  const turn = session.currentQuestion ?? 0;
  const latest = latestTranscriptEntry(session.transcript);
  const hasAnswer = Boolean(answerWithTopicSignal(latest?.answer));

  if (turn <= 1 && !hasAnswer) {
    weights.role *= 1.25;
    weights.focusAreas *= 1.35;
    weights.jobDescription *= 1.25;
    weights.resumeText *= 1.25;
    weights.activePillar *= 1.2;
    weights.companySignals *= 1.15;
    weights.levelHint *= 1.2;
    weights.latestAnswer *= 0.45;
    weights.latestQuestion *= 0.7;
  } else if (hasAnswer) {
    weights.latestAnswer *= 1.3;
    weights.latestQuestion *= 1.2;
    weights.activePillar *= 1.1;
    weights.resumeText *= 0.85;
    weights.jobDescription *= 0.9;
  }

  return weights;
}

/**
 * Returns each piece of context separately with conversational fusion & agenda extraction.
 */
export function explainRetrievalQuery(
  session: PromptInterviewSession,
  extras: RetrievalQueryExtras = {}
): RetrievalQueryParts {
  const latest = latestTranscriptEntry(session.transcript);
  const focusAreas = Array.isArray(session.focusAreas)
    ? session.focusAreas.filter((area): area is string => typeof area === "string").join(", ")
    : "";

  const activePillar = extractActiveAgendaPillar(
    session.sessionPlan,
    session.currentQuestion,
    session.startedAt,
    session.durationMinutes
  );

  const cleanedQuestion = latest?.question ? condenseForEmbedding(latest.question, MAX_QUESTION_CHARS) : "";
  // answerWithTopicSignal already calls cleanSpokenTranscript internally;
  // condenseForEmbedding calls it again – pass the cleaned text directly to avoid double-cleaning.
  const signalAnswer = answerWithTopicSignal(latest?.answer);
  const cleanedAnswer = signalAnswer
    ? (signalAnswer.length <= MAX_ANSWER_CHARS ? signalAnswer : signalAnswer.slice(0, MAX_ANSWER_CHARS))
    : "";

  const roleLabel = session.role?.trim() || session.type;
  const companySignals = condenseForEmbedding(
    extras.companySignals ?? "",
    MAX_COMPANY_SIGNAL_CHARS
  );

  return {
    role: `A ${session.type} interview for a ${roleLabel} role${focusAreas ? `, focusing on ${focusAreas}` : ""}.`,
    type: session.type,
    focusAreas,
    jobDescription: condenseForEmbedding(session.jobDescription, MAX_JD_CHARS),
    resumeText: condenseForEmbedding(session.resumeText, MAX_RESUME_CHARS),
    latestQuestion: cleanedQuestion,
    latestAnswer: cleanedAnswer,
    activePillar,
    companySignals,
    levelHint: extractSessionLevelHint(session),
  };
}


/**
 * The weighted sources that make up the query context.
 */
export function buildWeightedQueryParts(
  session: PromptInterviewSession,
  extras: RetrievalQueryExtras = {}
): { source: QueryWeightSource; text: string; weight: number }[] {
  const parts = explainRetrievalQuery(session, extras);
  const weights = resolveQueryWeights(session);

  return (Object.keys(QUERY_WEIGHTS) as QueryWeightSource[])
    .map((source) => ({ source, text: parts[source], weight: weights[source] }))
    .filter((part) => part.text.trim().length > 0);
}

/**
 * All context joined into a coherent retrieval query string.
 */
export function buildRetrievalQuery(
  session: PromptInterviewSession,
  extras: RetrievalQueryExtras = {}
): string {
  return buildWeightedQueryParts(session, extras)
    .map((part) => part.text)
    .join(" ")
    .slice(0, 2000);
}

/**
 * Formats the last N transcript turns for dense retrieval.
 * Newest turn is emphasized; the prior turn is a short continuity cue.
 */
export function formatRecentDialogueForQuery(
  transcript: PromptInterviewSession["transcript"],
  limit = RECENT_DIALOGUE_TURNS
): string {
  const recent = recentTranscriptEntries(transcript, limit);
  if (recent.length === 0) return "";

  const segments: string[] = [];
  for (let i = 0; i < recent.length; i++) {
    const turn = recent[i];
    const isLatest = i === recent.length - 1;
    const question = condenseForEmbedding(
      turn.question,
      isLatest ? MAX_QUESTION_CHARS : Math.min(MAX_PRIOR_TURN_CHARS, MAX_QUESTION_CHARS)
    );
    const answerSignal = answerWithTopicSignal(turn.answer);
    const answer = answerSignal
      ? condenseForEmbedding(
          answerSignal,
          isLatest ? MAX_ANSWER_CHARS : MAX_PRIOR_TURN_CHARS
        )
      : "";

    if (isLatest) {
      if (question && answer) {
        segments.push(`Current discussion: ${question}. Candidate response: ${answer}`);
      } else if (answer) {
        segments.push(`Current discussion and candidate response: ${answer}`);
      } else if (question) {
        segments.push(`Current discussion topic: ${question}`);
      }
    } else if (question || answer) {
      const prior = [question, answer].filter(Boolean).join(" → ");
      segments.push(`Earlier in this interview: ${prior}`);
    }
  }

  return segments.join(". ").slice(0, 700);
}

/**
 * Synthesizes a focused search query string for dense embedding.
 * Uses short-term memory (last 2 turns) plus agenda / resume / JD context.
 */
export function buildSynthesizedDenseQuery(
  session: PromptInterviewSession,
  activeResumeChunk: SemanticChunk | null,
  extras: RetrievalQueryExtras = {}
): string {
  const parts = explainRetrievalQuery(session, extras);
  const segments: string[] = [parts.role];

  if (parts.levelHint) {
    segments.push(parts.levelHint);
  }

  if (parts.focusAreas) {
    segments.push(`Focus areas: ${parts.focusAreas}`);
  }

  if (parts.activePillar) {
    segments.push(`Current topic pillar: ${parts.activePillar}`);
  }

  const recentDialogue = formatRecentDialogueForQuery(session.transcript);
  if (recentDialogue) {
    segments.push(recentDialogue);
  }

  if (activeResumeChunk) {
    const keyTerms = activeResumeChunk.keywords.slice(0, 10).join(", ");
    segments.push(`Focus area: ${activeResumeChunk.title || activeResumeChunk.section} - ${keyTerms || activeResumeChunk.text.slice(0, 150)}`);
  } else if (parts.resumeText) {
    segments.push(`Candidate context: ${parts.resumeText.slice(0, 200)}`);
  }

  if (parts.jobDescription) {
    segments.push(`Role requirements: ${parts.jobDescription.slice(0, 200)}`);
  }

  if (parts.companySignals) {
    segments.push(`Company interview signals: ${parts.companySignals}`);
  }

  return segments.join(". ").slice(0, 1200);
}

/**
 * Heuristic query routing strategy: balances dense semantic similarity vs sparse keyword precision
 * based on the interview format.
 */
export function getRetrievalStrategy(interviewType: string): {
  denseWeight: number;
  sparseWeight: number;
} {
  switch (interviewType) {
    case "behavioral-leadership":
    case "recruiter-screen":
    case "hiring-manager":
      // Soft skills: semantic similarity still dominates, but sparse helps LP/theme keywords
      return { denseWeight: 0.75, sparseWeight: 0.25 };
    case "system-design":
    case "bar-raiser":
      // Architectural trade-offs benefit from keyword anchors (cache, kafka, quorum, etc.)
      return { denseWeight: 0.45, sparseWeight: 0.55 };
    case "coding-algorithms":
      // Algorithms / DS / frameworks: sparse keywords drive precision
      return { denseWeight: 0.35, sparseWeight: 0.65 };
    case "domain-role":
      return { denseWeight: 0.4, sparseWeight: 0.6 };
    default:
      return { denseWeight: 0.55, sparseWeight: 0.45 };
  }
}
