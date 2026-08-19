import { latestTranscriptEntry, type PromptInterviewSession } from "@/lib/interview/domain";
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
]);

export const NON_ANSWER_MARKERS = [
  "dont know", "do not know", "no idea", "dunno", "not sure", "unsure",
  "no clue", "cant answer", "cannot answer", "skip", "pass on this",
  "next question", "another question", "repeat the question", "no comment",
];

export const QUERY_WEIGHTS = {
  role: 0.15,
  latestAnswer: 0.35,
  jobDescription: 0.25,
  resumeText: 0.25,
} as const;

export const MAX_JD_CHARS = 600;
export const MAX_RESUME_CHARS = 600;
export const MAX_ANSWER_CHARS = 600;

export interface RetrievalQueryParts {
  role: string;
  type: string;
  focusAreas: string;
  jobDescription: string;
  resumeText: string;
  latestAnswer: string;
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
 * Trims text down to a size suitable for embedding, keeping whole sentences where possible.
 */
export function condenseForEmbedding(text: string | null | undefined, maxChars: number): string {
  if (!text) return "";

  const cleaned = stripContactDetails(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxChars);
  const lastBreak = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("; "));
  return lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak + 1) : truncated;
}

/**
 * Returns the answer only if it says enough to guide the search.
 */
export function answerWithTopicSignal(answer: string | null | undefined): string {
  if (!answer) return "";

  const normalized = answer.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const contentWords = new Set(
    normalized.split(" ").filter((word) => word.length > 2 && !ANSWER_STOP_WORDS.has(word))
  );

  if (contentWords.size < MIN_ANSWER_CONTENT_WORDS) return "";

  if (NON_ANSWER_MARKERS.some((marker) => normalized.includes(marker))) {
    return "";
  }

  return answer;
}

/**
 * Returns each piece of context separately.
 */
export function explainRetrievalQuery(session: PromptInterviewSession): RetrievalQueryParts {
  const latest = latestTranscriptEntry(session.transcript);
  const focusAreas = Array.isArray(session.focusAreas)
    ? session.focusAreas.filter((area): area is string => typeof area === "string").join(", ")
    : "";

  return {
    role: `A ${session.type} interview for a ${session.role} role${focusAreas ? `, focusing on ${focusAreas}` : ""}.`,
    type: session.type,
    focusAreas,
    jobDescription: condenseForEmbedding(session.jobDescription, MAX_JD_CHARS),
    resumeText: condenseForEmbedding(session.resumeText, MAX_RESUME_CHARS),
    latestAnswer: condenseForEmbedding(answerWithTopicSignal(latest?.answer), MAX_ANSWER_CHARS),
  };
}

/**
 * The weighted sources that make up the query context.
 */
export function buildWeightedQueryParts(
  session: PromptInterviewSession
): { source: keyof typeof QUERY_WEIGHTS; text: string; weight: number }[] {
  const parts = explainRetrievalQuery(session);

  return (Object.keys(QUERY_WEIGHTS) as (keyof typeof QUERY_WEIGHTS)[])
    .map((source) => ({ source, text: parts[source], weight: QUERY_WEIGHTS[source] }))
    .filter((part) => part.text.trim().length > 0);
}

/**
 * All context joined into a coherent retrieval query string.
 */
export function buildRetrievalQuery(session: PromptInterviewSession): string {
  return buildWeightedQueryParts(session)
    .map((part) => part.text)
    .join(" ")
    .slice(0, 2000);
}

/**
 * Synthesizes a focused search query string for dense embedding.
 */
export function buildSynthesizedDenseQuery(
  session: PromptInterviewSession,
  activeResumeChunk: SemanticChunk | null
): string {
  const parts = explainRetrievalQuery(session);
  const segments: string[] = [parts.role];

  if (parts.latestAnswer) {
    segments.push(`Discussion topic and candidate response: ${parts.latestAnswer}`);
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
      // Soft skills, communication, leadership: semantic similarity dominates
      return { denseWeight: 0.8, sparseWeight: 0.2 };
    case "system-design":
    case "bar-raiser":
      // Architectural trade-offs and concepts: equal balance
      return { denseWeight: 0.5, sparseWeight: 0.5 };
    case "coding-algorithms":
      // Algorithms, data structures, complexity: sparse keywords get higher weight
      return { denseWeight: 0.45, sparseWeight: 0.55 };
    default:
      return { denseWeight: 0.6, sparseWeight: 0.4 };
  }
}
