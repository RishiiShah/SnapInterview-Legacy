import type { PromptInterviewSession } from "@/lib/interview/domain";
import { normalizeRoleSlug } from "@/lib/rag/taxonomy";
import { ragTracePath, type RagTraceRecord } from "@/lib/rag/trace";
import {
  chunkResumeSemantic,
  extractKeyTechnicalTerms,
  selectActiveResumeChunk,
} from "@/lib/rag/chunker";
import { executeHybridRetrieval, type HybridCandidateRow } from "@/lib/rag/hybrid";
import { rerankCandidates, type ScoredRerankedCandidate } from "@/lib/rag/reranker";
import { logger } from "@/utils/logger";
import {
  buildRetrievalQuery,
  buildSynthesizedDenseQuery,
  buildWeightedQueryParts,
  explainRetrievalQuery,
  getRetrievalStrategy,
  QUERY_WEIGHTS,
} from "./retrieval-query";
import {
  MMR_LAMBDA,
  parseVector,
  REDUNDANCY_THRESHOLD,
  selectWithMmr,
} from "./retrieval-selection";
import {
  loadExcludedQuestionIds,
  scheduleRetrievalSideEffects,
  type RetrievalExecutionContext,
  type RetrievalSideEffects,
} from "./retrieval-history";
import type { RetrievedQuestion } from "./retrieval-format";

// Loaded on first use, not at import time.
export async function loadDeps() {
  const [{ prisma }, embeddings] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/rag/embeddings"),
  ]);
  return { prisma, ...embeddings };
}

export type RetrievalComputation = {
  questions: RetrievedQuestion[];
  sideEffects: RetrievalSideEffects | null;
};

export function emptyRetrievalComputation(): RetrievalComputation {
  return { questions: [], sideEffects: null };
}

/** How many questions end up in the prompt. */
export const DEFAULT_LIMIT = 6;
/** Questions fetched from the database before reranking and filtering. */
export const CANDIDATE_POOL = 40;
/** Questions below this score threshold are dropped. */
export const MIN_SIMILARITY = 0.20;
/** Longest retrieval may delay a turn before it gives up. */
export const RETRIEVAL_TIMEOUT_MS = 2500;

/**
 * Core Two-Stage Retrieval & Reranking Workflow.
 */
export async function retrieve(
  session: PromptInterviewSession,
  limit: number,
  context: RetrievalExecutionContext
): Promise<RetrievalComputation> {
  const query = buildRetrievalQuery(session);
  if (!query) {
    return emptyRetrievalComputation();
  }

  const startedAt = Date.now();
  const { prisma, localEmbedder, toVectorLiteral, cosineSimilarity } = await loadDeps();
  if (!context.isActive()) return emptyRetrievalComputation();

  const excludedIdsPromise = loadExcludedQuestionIds(session, prisma);
  const parts = explainRetrievalQuery(session);
  const roleSlug = normalizeRoleSlug(session.role);

  // 1. Semantic Chunking & Initial Active Chunk
  const allResumeChunks = session.resumeText ? chunkResumeSemantic(session.resumeText) : [];
  const { activeChunk: initialActiveResumeChunk } = selectActiveResumeChunk(
    allResumeChunks,
    new Set(),
    session.currentQuestion,
    { startedAt: session.startedAt, durationMinutes: session.durationMinutes }
  );

  // 2. Formulate Synthesized Dense and Sparse Query
  const denseQueryText = buildSynthesizedDenseQuery(session, initialActiveResumeChunk);
  const sparseKeywords = [
    session.role,
    session.type,
    parts.focusAreas,
    parts.latestAnswer ? extractKeyTechnicalTerms(parts.latestAnswer).join(" ") : "",
    initialActiveResumeChunk ? initialActiveResumeChunk.keywords.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ");

  // 3. Dense Embedding started concurrently with exclusions loading
  const embedStartedAt = Date.now();
  const embeddingPromise = localEmbedder
    .embed([denseQueryText])
    .then((vectors) => ({ vectors, embedMs: Date.now() - embedStartedAt }));

  const [{ vectors, embedMs }, excludedIds] = await Promise.all([
    embeddingPromise,
    excludedIdsPromise,
  ]);
  if (!context.isActive()) return emptyRetrievalComputation();

  const excludedSet = new Set(excludedIds);
  const queryVector = vectors[0] ?? [];
  const vectorLiteral = toVectorLiteral(queryVector);

  // 4. Stage 1: Hybrid Retrieval (pgvector + FTS with RRF & Query Routing)
  const queryStartedAt = Date.now();
  const { denseWeight, sparseWeight } = getRetrievalStrategy(session.type);
  const hybridPool: HybridCandidateRow[] = await executeHybridRetrieval(prisma, {
    queryVectorLiteral: vectorLiteral,
    sparseKeywords,
    roleSlug,
    interviewType: session.type,
    poolLimit: CANDIDATE_POOL,
    denseWeight,
    sparseWeight,
  });
  if (!context.isActive()) return emptyRetrievalComputation();

  const queryMs = Date.now() - queryStartedAt;

  // 5. Stage 2: High-Precision Cross-Encoder Reranking
  const rerankStartedAt = Date.now();
  const rerankableCandidates = hybridPool.map((c) => ({
    id: c.id,
    question: c.question,
    answer: c.answer,
    category: c.category,
    difficulty: c.difficulty,
    roleTags: c.roleTags,
    types: c.types,
    baseScore: c.similarity ?? c.rrfScore,
  }));

  const rerankedPool: ScoredRerankedCandidate[] = await rerankCandidates(
    denseQueryText,
    rerankableCandidates,
    {
      targetRoleSlug: roleSlug,
      topK: CANDIDATE_POOL,
    }
  );
  if (!context.isActive()) return emptyRetrievalComputation();

  const rerankMs = Date.now() - rerankStartedAt;

  // Attach embedding vectors back for MMR diversity
  const vectorById = new Map<string, number[]>();
  for (const item of hybridPool) {
    if (item.embedding) {
      vectorById.set(item.id, parseVector(item.embedding));
    }
  }

  // 6. Exclusion Filtering & MMR Selection
  const rejections = new Map<string, "similarity_floor" | "already_retrieved" | "mmr_redundant">();
  const fresh: { row: ScoredRerankedCandidate; vector: number[] }[] = [];
  const seen: { row: ScoredRerankedCandidate; vector: number[] }[] = [];

  for (const cand of rerankedPool) {
    if (cand.fusedScore < MIN_SIMILARITY) {
      rejections.set(cand.question, "similarity_floor");
      continue;
    }
    const candidateWithVec = { row: cand, vector: vectorById.get(cand.id) ?? [] };
    if (excludedSet.has(cand.id)) {
      rejections.set(cand.question, "already_retrieved");
      seen.push(candidateWithVec);
    } else {
      fresh.push(candidateWithVec);
    }
  }

  const survivedCount = fresh.length;

  // Prioritize unseen questions with MMR
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
    similarity: row.fusedScore,
  }));

  if (!context.isActive()) return emptyRetrievalComputation();

  // 7. Trace Logging
  let trace: RagTraceRecord | null = null;
  if (ragTracePath()) {
    const selectedQuestions = new Set(selected.map((entry) => entry.question));
    const weightedParts = buildWeightedQueryParts(session);
    const weightTotal = weightedParts.reduce((sum, p) => sum + p.weight, 0) || 1;

    trace = {
      timestamp: new Date().toISOString(),
      session: {
        role: session.role,
        roleSlug,
        type: session.type,
        difficulty: session.difficulty ?? null,
        company: session.company ?? null,
        currentQuestion: session.currentQuestion,
        questionCount: session.questionCount,
        durationMinutes: session.durationMinutes,
      },
      query: {
        parts: weightedParts.map((p) => ({
          source: p.source,
          weight: p.weight,
          effectiveWeight: Number((p.weight / weightTotal).toFixed(4)),
          text: p.text,
        })),
        omitted: (Object.keys(QUERY_WEIGHTS) as (keyof typeof QUERY_WEIGHTS)[]).filter(
          (source) => !parts[source]?.trim()
        ),
        synthesized: denseQueryText,
        sparseKeywords,
      },
      resume:
        allResumeChunks.length > 0
          ? {
              chunksConsidered: allResumeChunks.length,
              chunkScores: allResumeChunks.map((c) => ({
                score: c.priority,
                selected: initialActiveResumeChunk?.id === c.id,
                text: c.text,
                section: c.section,
              })),
            }
          : null,
      exclusion: { excludedIdCount: excludedIds.length, backfilledFromSeen: backfilledCount },
      candidates: {
        fromDatabase: hybridPool.length,
        survived: survivedCount,
        all: rerankedPool.map((c) => {
          const original = hybridPool.find((h) => h.id === c.id);
          return {
            question: c.question,
            category: c.category,
            similarity: Number(c.fusedScore.toFixed(4)),
            roleMatched: c.roleTags?.includes(roleSlug) ?? false,
            denseRank: original?.denseRank,
            sparseRank: original?.sparseRank,
            rrfScore: original?.rrfScore,
            rerankScore: c.rerankScore,
            fusedScore: c.fusedScore,
            rejectedBy: selectedQuestions.has(c.question)
              ? null
              : (rejections.get(c.question) ?? "not_selected"),
          };
        }),
      },
      returned: selected.map((entry) => ({
        question: entry.question,
        category: entry.category,
        similarity: Number(entry.similarity.toFixed(4)),
        hasReferenceAnswer: Boolean(entry.answer),
      })),
      timings: { embedMs, queryMs, rerankMs, totalMs: Date.now() - startedAt },
      config: {
        minSimilarity: MIN_SIMILARITY,
        mmrLambda: MMR_LAMBDA,
        redundancyThreshold: REDUNDANCY_THRESHOLD,
        candidatePool: CANDIDATE_POOL,
        limit,
      },
    };
  }

  if (!context.isActive()) return emptyRetrievalComputation();
  return {
    questions: selected,
    sideEffects: {
      prisma,
      questionCorpusIds: selected.map((entry) => entry.id),
      trace,
    },
  };
}

/**
 * Feature flag for RAG retrieval.
 */
export function isQuestionRetrievalEnabled(): boolean {
  const flag = process.env.RAG_RETRIEVAL_ENABLED;
  if (flag != null) {
    return flag === "true" || flag === "1";
  }
  return process.env.NODE_ENV !== "test";
}

/**
 * Retrieves questions with fallback safety and timeout protection.
 */
export async function retrieveQuestionsForSession(
  session: PromptInterviewSession,
  limit: number = DEFAULT_LIMIT
): Promise<RetrievedQuestion[]> {
  if (!isQuestionRetrievalEnabled()) {
    return [];
  }

  const controller = new AbortController();
  const context: RetrievalExecutionContext = {
    signal: controller.signal,
    isActive: () => !controller.signal.aborted,
  };
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const computation = await Promise.race([
      retrieve(session, limit, context),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          resolve(null);
        }, RETRIEVAL_TIMEOUT_MS);
      }),
    ]);
    if (!computation || !context.isActive()) {
      logger.warn("Question retrieval timed out; continuing without corpus", {
        role: session.role,
        timeoutMs: RETRIEVAL_TIMEOUT_MS,
      });
      return [];
    }

    scheduleRetrievalSideEffects(session, context, computation.sideEffects);
    return computation.questions;
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
