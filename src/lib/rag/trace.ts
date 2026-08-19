import { logger } from "@/utils/logger";

/**
 * A log of every search, for tuning and debugging.
 *
 * One JSON object per line, rather than one big JSON array. Turns are written as
 * they happen, and rewriting a whole array each time would be slow and could
 * lose records when two turns overlap. Each line stands alone, so tools like
 * `jq` can read them one at a time and a half-written line cannot damage the
 * rest.
 */

export interface RagTraceCandidate {
  question: string;
  category: string;
  /** Score used for ranking, including the role bonus. */
  similarity: number;
  roleMatched: boolean;
  denseRank?: number;
  sparseRank?: number;
  rrfScore?: number;
  rerankScore?: number;
  fusedScore?: number;
  /** Why this question was not used, or null if it was. */
  rejectedBy: "similarity_floor" | "already_retrieved" | "mmr_redundant" | "not_selected" | null;
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
    durationMinutes?: number;
  };
  query: {
    /** The full text of each piece of context, not shortened. */
    parts: { source: string; weight: number; effectiveWeight: number; text: string }[];
    omitted: string[];
    synthesized?: string;
    sparseKeywords?: string;
  };
  resume: {
    chunksConsidered: number;
    /** Every resume slice with its score, best first. */
    chunkScores: { score: number; selected: boolean; text: string; section?: string }[];
  } | null;
  exclusion: {
    /** Questions this candidate has already been shown. */
    excludedIdCount: number;
    /** How many already-shown questions were reused because none were left. */
    backfilledFromSeen: number;
  };
  candidates: {
    fromDatabase: number;
    survived: number;
    /** Every question the database returned, and what happened to it. */
    all: RagTraceCandidate[];
  };
  returned: { question: string; category: string; similarity: number; hasReferenceAnswer: boolean; rerankScore?: number }[];
  timings: { embedMs: number; queryMs: number; rerankMs?: number; totalMs: number };
  /** The settings used for this run, so older logs still make sense. */
  config: Record<string, number>;
}

const DEFAULT_TRACE_PATH = "rag-trace.jsonl";

export function ragTracePath(): string | null {
  const explicit = process.env.RAG_TRACE_FILE;
  if (explicit) {
    return explicit;
  }
  // RAG_DEBUG on its own writes to the default file.
  const debug = process.env.RAG_DEBUG;
  return debug === "true" || debug === "1" ? DEFAULT_TRACE_PATH : null;
}

/**
 * Never breaks an interview. A failure to write is logged and ignored.
 */
export async function writeRagTrace(record: RagTraceRecord): Promise<void> {
  const path = ragTracePath();
  if (!path) {
    return;
  }

  try {
    // Loaded on demand, so builds that never log this do not include it, and
    // so it stays harmless where writing files is not possible.
    const { appendFile } = await import("fs/promises");
    await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    logger.warn("Failed to write RAG trace", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
