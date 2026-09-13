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
  answerWithTopicSignal,
  buildRetrievalQuery,
  buildSynthesizedDenseQuery,
  buildWeightedQueryParts,
  explainRetrievalQuery,
  extractProfileLevel,
  getRetrievalStrategy,
  QUERY_WEIGHTS,
  RECENT_DIALOGUE_TURNS,
  type RetrievalQueryExtras,
} from "./retrieval-query";
import { recentTranscriptEntries } from "@/lib/interview/domain";
import {
  MMR_LAMBDA,
  parseVector,
  REDUNDANCY_THRESHOLD,
  selectWithMmr,
} from "./retrieval-selection";
import { inferPreferredCategories } from "./retrieval-categories";
import {
  buildGapFillQueries,
  buildInterviewCoverage,
  collectTargetTerms,
  fuseMultiQueryPools,
  type MultiQueryBranch,
} from "./retrieval-coverage";
import {
  loadExcludedQuestionIds,
  scheduleRetrievalSideEffects,
  type RetrievalExecutionContext,
  type RetrievalSideEffects,
} from "./retrieval-history";
import type { RetrievedQuestion } from "./retrieval-format";
import { readRoundProfileFromSessionPlan } from "@/lib/plans/session-context";

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
export const CANDIDATE_POOL = 20;
/** Per multi-query branch pool size before fusion. */
export const BRANCH_POOL = 14;
/** Questions below this score threshold are dropped. */
export const MIN_SIMILARITY = 0.20;
/**
 * Retrieval budget. Multi-query + cold reranker can exceed 2.5s on first turn;
 * keep headroom so we return results instead of emptying the prompt.
 */
export const RETRIEVAL_TIMEOUT_MS = 3500;

function preferredCategoriesFromSession(
  focusAreas: string,
  activePillar: string
): string[] {
  const raw = [focusAreas, activePillar]
    .filter(Boolean)
    .flatMap((value) => value.split(/[,/|]/))
    .map((value) => value.trim())
    .filter((value) => value.length > 2);
  return [...new Set(raw)].slice(0, 8);
}

/** Prefer relevance over variety for keyword-heavy technical rounds. */
function mmrLambdaForInterviewType(interviewType: string): number {
  switch (interviewType) {
    case "system-design":
    case "coding-algorithms":
    case "domain-role":
      return 0.92;
    case "bar-raiser":
      return 0.86;
    default:
      return MMR_LAMBDA;
  }
}

function isTechnicalInterviewType(interviewType: string): boolean {
  return (
    interviewType === "system-design" ||
    interviewType === "coding-algorithms" ||
    interviewType === "domain-role" ||
    interviewType === "bar-raiser"
  );
}

async function resolveCompanySignals(
  session: PromptInterviewSession,
  roleSlug: string
): Promise<string> {
  if (!session.company?.trim()) return "";
  try {
    const { resolveCompanyPack } = await import("@/data/company-packs");
    const level =
      extractProfileLevel(session.sessionPlan) ||
      (session.difficulty === "easy"
        ? "entry-level"
        : session.difficulty === "hard"
          ? "senior"
          : "mid-level");
    const resolved = await resolveCompanyPack(session.company, roleSlug, level);
    const themeShapes = resolved.filteredThemes
      .filter((theme) => theme.types.length === 0 || theme.types.includes(session.type))
      .map((theme) => theme.shape)
      .slice(0, 2);
    return [
      resolved.methodSummary,
      ...resolved.levelSignals.slice(0, 2),
      ...resolved.roleFamilySignals.slice(0, 2),
      ...themeShapes,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);
  } catch (error) {
    logger.warn("Company pack resolution for retrieval failed", {
      company: session.company,
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

/**
 * Core Two-Stage Retrieval & Reranking Workflow.
 */
export async function retrieve(
  session: PromptInterviewSession,
  limit: number,
  context: RetrievalExecutionContext
): Promise<RetrievalComputation> {
  const roleSlug = normalizeRoleSlug(session.role);
  const roundProfile = readRoundProfileFromSessionPlan(session.sessionPlan);
  const roundTerms = roundProfile
    ? [
        ...roundProfile.competencies,
        ...roundProfile.question_strategy.required_tags,
        ...roundProfile.question_strategy.preferred_tags,
      ].join(" ")
    : "";
  const companySignals = await resolveCompanySignals(session, roleSlug);
  const queryExtras: RetrievalQueryExtras = companySignals
    ? { companySignals }
    : {};

  const query = buildRetrievalQuery(session, queryExtras);
  if (!query) {
    return emptyRetrievalComputation();
  }

  const startedAt = Date.now();
  const { prisma, localEmbedder, toVectorLiteral, cosineSimilarity } = await loadDeps();
  if (!context.isActive()) return emptyRetrievalComputation();

  const excludedIdsPromise = loadExcludedQuestionIds(session, prisma);
  const parts = explainRetrievalQuery(session, queryExtras);

  // 1. Semantic Chunking & Initial Active Chunk
  const allResumeChunks = session.resumeText ? chunkResumeSemantic(session.resumeText) : [];
  const { activeChunk: initialActiveResumeChunk } = selectActiveResumeChunk(
    allResumeChunks,
    new Set(),
    session.currentQuestion,
    { startedAt: session.startedAt, durationMinutes: session.durationMinutes }
  );

  // 2. Formulate Synthesized Dense and Sparse Query
  const denseQueryText = buildSynthesizedDenseQuery(
    session,
    initialActiveResumeChunk,
    queryExtras
  );
  const resumeSkillKeywords = allResumeChunks
    .filter((chunk) => chunk.section === "skills" || chunk.priority >= 1.0)
    .flatMap((chunk) => chunk.keywords)
    .slice(0, 30);
  const recentTurns = recentTranscriptEntries(session.transcript, RECENT_DIALOGUE_TURNS);
  const dialogueTerms = [
    ...recentTurns.flatMap((turn) => [
      ...extractKeyTechnicalTerms(turn.question),
      ...extractKeyTechnicalTerms(answerWithTopicSignal(turn.answer) || turn.answer),
    ]),
    ...resumeSkillKeywords,
    ...(initialActiveResumeChunk?.keywords ?? []),
  ];
  const sparseKeywords = [
    session.role,
    session.type,
    parts.focusAreas,
    parts.activePillar,
    parts.levelHint,
    parts.companySignals,
    roundTerms,
    dialogueTerms.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const focusPillars = preferredCategoriesFromSession(parts.focusAreas, parts.activePillar);
  const preferredCategories = inferPreferredCategories({
    interviewType: session.type,
    focusAreas: parts.focusAreas,
    activePillar: parts.activePillar,
    technicalTerms: dialogueTerms,
  });
  for (const category of [...(roundProfile?.question_strategy.preferred_categories ?? [])].reverse()) {
    const existingIndex = preferredCategories.indexOf(category);
    if (existingIndex >= 0) preferredCategories.splice(existingIndex, 1);
    preferredCategories.unshift(category);
  }
  for (const label of focusPillars) {
    if (!preferredCategories.includes(label)) preferredCategories.push(label);
  }

  const targetTerms = collectTargetTerms([
    parts.latestAnswer,
    parts.latestQuestion,
    parts.focusAreas,
    parts.activePillar,
    resumeSkillKeywords.join(" "),
    parts.companySignals,
    roundTerms,
  ]);
  const targetPillars = [
    ...focusPillars,
    ...(parts.activePillar ? [parts.activePillar] : []),
  ].filter((value, index, arr) => arr.findIndex((v) => v.toLowerCase() === value.toLowerCase()) === index);

  const coverage = buildInterviewCoverage({
    transcript: session.transcript,
    targetTerms,
    targetCategories: preferredCategories.slice(0, 10),
    targetPillars,
    activePillar: parts.activePillar,
  });

  // Prefer still-missing categories at the front of the preference list.
  for (const missing of [...coverage.missingCategories].reverse()) {
    const idx = preferredCategories.indexOf(missing);
    if (idx >= 0) preferredCategories.splice(idx, 1);
    preferredCategories.unshift(missing);
  }

  // Gap-fill only after we have real interview history. On the first answered turn,
  // "missing" ≈ everything not in that one answer, which duplicates conversational
  // retrieval and regularly blows the cold-start latency budget.
  const transcriptLen = Array.isArray(session.transcript) ? session.transcript.length : 0;
  const gapFillQueries =
    transcriptLen >= 2
      ? buildGapFillQueries(coverage, {
          role: session.role || session.type,
          interviewType: session.type,
        })
      : null;

  // Conversational query already includes active pillar / focus areas — a separate
  // agenda branch was redundant cost. Gap-fill is sparse-only below, so it does not
  // need a second embedding of broad conversational context.
  const denseTexts = [denseQueryText];

  // 3. Dense Embedding (batch all branches) started concurrently with exclusions loading
  const embedStartedAt = Date.now();
  const embeddingPromise = localEmbedder
    .embed(denseTexts)
    .then((vectors) => ({ vectors, embedMs: Date.now() - embedStartedAt }));

  const [{ vectors, embedMs }, excludedIds] = await Promise.all([
    embeddingPromise,
    excludedIdsPromise,
  ]);
  if (!context.isActive()) return emptyRetrievalComputation();

  const excludedSet = new Set(excludedIds);

  // 4. Stage 1: Hybrid retrieval — conversational (+ optional gap-fill), then RRF fuse
  const queryStartedAt = Date.now();
  const { denseWeight, sparseWeight } = getRetrievalStrategy(session.type);

  const branchSpecs: Array<{
    label: MultiQueryBranch["label"];
    weight: number;
    denseIndex: number;
    sparse: string;
    denseWeight: number;
    sparseWeight: number;
    matchAnySparseTerm: boolean;
  }> = [{
    label: "conversational",
    weight: 1,
    denseIndex: 0,
    sparse: sparseKeywords,
    denseWeight,
    sparseWeight,
    matchAnySparseTerm: false,
  }];

  if (gapFillQueries) {
    branchSpecs[0].weight = 0.6;
    branchSpecs.push({
      label: "gapFill",
      weight: 0.4,
      denseIndex: 0,
      sparse: gapFillQueries.sparseKeywords,
      denseWeight: 0,
      sparseWeight: 1,
      matchAnySparseTerm: true,
    });
  }

  const branchPools = await Promise.all(
    branchSpecs.map(async (spec) => {
      const queryVector = vectors[spec.denseIndex] ?? vectors[0] ?? [];
      const rows = await executeHybridRetrieval(prisma, {
        queryVectorLiteral: toVectorLiteral(queryVector),
        sparseKeywords: spec.sparse,
        roleSlug,
        interviewType: session.type,
        poolLimit: BRANCH_POOL,
        denseWeight: spec.denseWeight,
        sparseWeight: spec.sparseWeight,
        matchAnySparseTerm: spec.matchAnySparseTerm,
        // Push category filtering into the SQL dense search for technical rounds
        // (conversational branch only — gapFill intentionally broadens scope).
        preferredCategories:
          spec.label === "conversational" && isTechnicalInterviewType(session.type)
            ? preferredCategories.slice(0, 10)
            : undefined,
      });
      return { label: spec.label, weight: spec.weight, rows };
    })
  );

  const hybridPool: HybridCandidateRow[] = fuseMultiQueryPools(branchPools, CANDIDATE_POOL);
  if (!context.isActive()) return emptyRetrievalComputation();

  const queryMs = Date.now() - queryStartedAt;

  // 5. Stage 2: High-Precision Cross-Encoder Reranking
  const rerankStartedAt = Date.now();
  // Normalize baseScore to [0, 1]:
  // - `similarity` from dense pgvector is already a cosine similarity in [0, 1] ✅
  // - `rrfScore` is in [0, ~0.016] range (denseWeight+sparseWeight)/(60+1) at rank 1.
  //   Sparse-only candidates have null similarity and fall back to rrfScore, which is
  //   near-zero and would be treated as irrelevant by the heuristic formula.
  //   We normalize it by the theoretical max RRF score so all candidates get a fair baseScore.
  const MAX_RRF_SCORE = 1.0 / (60 + 1); // ≈ 0.0164 with weights summing to 1
  const rerankableCandidates = hybridPool.map((c) => ({
    id: c.id,
    sourceId: c.sourceId,
    question: c.question,
    answer: c.answer,
    commonMistakes: c.commonMistakes,
    category: c.category,
    difficulty: c.difficulty,
    level: c.level,
    roleTags: c.roleTags,
    types: c.types,
    baseScore: c.similarity != null
      ? Math.min(Math.max(c.similarity, 0), 1)
      : Math.min(c.rrfScore / MAX_RRF_SCORE, 1),
  }));

  const targetLevel =
    extractProfileLevel(session.sessionPlan) ||
    (session.difficulty === "easy"
      ? "entry-level"
      : session.difficulty === "hard"
        ? "senior"
        : "mid-level");

  const rerankedPool: ScoredRerankedCandidate[] = await rerankCandidates(
    denseQueryText,
    rerankableCandidates,
    {
      targetRoleSlug: roleSlug,
      targetDifficulty: session.difficulty ?? undefined,
      targetLevel,
      preferredCategories: preferredCategories.slice(0, 10),
      strictCategoryPreference: isTechnicalInterviewType(session.type),
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

  // Prioritize unseen questions with MMR; bias later picks toward uncovered terms/categories.
  const mmrLambda = mmrLambdaForInterviewType(session.type);
  const coverageTerms = [
    ...dialogueTerms.map((term) => term.toLowerCase()),
    ...coverage.missingTerms,
  ].filter((term) => term.length >= 3);
  const mmrOptions = {
    mmrLambda,
    coverageTerms: [...new Set(coverageTerms)].slice(0, 40),
    gapCategories: coverage.missingCategories.slice(0, 8),
    // Behavioral benefits most from later-slot gap fill without moving #1/#2 off the story.
    continuitySlots: session.type === "behavioral-leadership" ? 2 : 2,
    gapCategoryWeight: session.type === "behavioral-leadership" ? 0.3 : 0.14,
  };
  const chosen = selectWithMmr([...fresh], limit, cosineSimilarity, mmrOptions);
  let backfilledCount = 0;
  if (chosen.length < limit && seen.length > 0) {
    const backfill = selectWithMmr([...seen], limit - chosen.length, cosineSimilarity, mmrOptions);
    backfilledCount = backfill.length;
    for (const row of backfill) {
      rejections.delete(row.question);
      chosen.push(row);
    }
  }

  const selected = chosen.map((row) => ({
    id: row.id,
    sourceId: row.sourceId ?? null,
    question: row.question,
    answer: row.answer,
    commonMistakes: row.commonMistakes ?? null,
    category: row.category,
    difficulty: row.difficulty,
    level: row.level,
    similarity: row.fusedScore,
  }));

  if (!context.isActive()) return emptyRetrievalComputation();

  // 7. Trace Logging
  let trace: RagTraceRecord | null = null;
  if (ragTracePath()) {
    const selectedQuestions = new Set(selected.map((entry) => entry.question));
    const weightedParts = buildWeightedQueryParts(session, queryExtras);
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
        mmrLambda,
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
