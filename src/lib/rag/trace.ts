import { logger } from "@/utils/logger";

/**
 * Append-only trace of every retrieval, for tuning and debugging.
 *
 * Written as JSONL (one JSON object per line) rather than a single JSON array:
 * turns append concurrently, and rewriting a whole array on each write would
 * both race and grow expensive. Every line is independently parseable, so
 * `jq` works line by line and a partial write can never corrupt earlier records.
 */

export interface RagTraceCandidate {
  question: string;
  category: string;
  /** Similarity including the role boost, exactly as ranked. */
  similarity: number;
  roleMatched: boolean;
  /** Why a candidate did not make the final set, or null if it did. */
  rejectedBy: "similarity_floor" | "already_asked" | "mmr_redundant" | "not_selected" | null;
}

export interface RagTraceRecord {
  timestamp: string;
  session: {
    role: string;
    roleSlug: string;
    type: string;
    difficulty: string | null;
    company: string | null;
    currentQuestion: number;
    questionCount: number;
  };
  query: {
    /** Full text per source -- untruncated, unlike the terminal log. */
    parts: { source: string; weight: number; effectiveWeight: number; text: string }[];
    omitted: string[];
  };
  resume: {
    chunksConsidered: number;
    /** Every chunk with its score against the role vector, best first. */
    chunkScores: { score: number; selected: boolean; text: string }[];
  } | null;
  exclusion: {
    alreadyAskedCount: number;
    alreadyAsked: string[];
  };
  candidates: {
    fromDatabase: number;
    survived: number;
    /** Every candidate the database returned, with its fate. */
    all: RagTraceCandidate[];
  };
  returned: { question: string; category: string; similarity: number; hasReferenceAnswer: boolean }[];
  timings: { embedMs: number; queryMs: number; totalMs: number };
  /** The tuning constants in force for this run, so old traces stay interpretable. */
  config: Record<string, number>;
}

const DEFAULT_TRACE_PATH = "rag-trace.jsonl";

export function ragTracePath(): string | null {
  const explicit = process.env.RAG_TRACE_FILE;
  if (explicit) {
    return explicit;
  }
  // RAG_DEBUG alone turns on tracing at the default path.
  const debug = process.env.RAG_DEBUG;
  return debug === "true" || debug === "1" ? DEFAULT_TRACE_PATH : null;
}

/**
 * Best-effort, like retrieval itself: tracing must never break an interview.
 * Failures are logged once and swallowed.
 */
export async function writeRagTrace(record: RagTraceRecord): Promise<void> {
  const path = ragTracePath();
  if (!path) {
    return;
  }

  try {
    // Imported lazily so nothing filesystem-related is pulled into bundles that
    // never trace, and so this stays inert on runtimes without fs.
    const { appendFile } = await import("fs/promises");
    await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    logger.warn("Failed to write RAG trace", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
