import { latestTranscriptEntry, type PromptInterviewSession } from "@/lib/interview/domain";
import { normalizeRoleSlug } from "@/lib/rag/taxonomy";
import { ragTracePath, writeRagTrace } from "@/lib/rag/trace";
import {
  chunkResumeSemantic,
  extractKeyTechnicalTerms,
  selectActiveResumeChunk,
  type SemanticChunk,
} from "@/lib/rag/chunker";
import { executeHybridRetrieval, type HybridCandidateRow } from "@/lib/rag/hybrid";
import { rerankCandidates, type ScoredRerankedCandidate } from "@/lib/rag/reranker";
import { logger } from "@/utils/logger";

// Loaded on first use, not at import time.
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
/** Questions fetched from the database before reranking and filtering. */
const CANDIDATE_POOL = 40;
/** Two questions this similar are treated as redundant. */
const REDUNDANCY_THRESHOLD = 0.82;
/** Balances relevance against variety when picking the final set. */
const MMR_LAMBDA = 0.72;
/** Questions below this score threshold are dropped. */
const MIN_SIMILARITY = 0.20;
/** How far back to look for questions this candidate has already seen. */
const PRIOR_QUESTION_LIMIT = 60;
/** Longest retrieval may delay a turn before it gives up. */
const RETRIEVAL_TIMEOUT_MS = 2500;

/**
 * Removes names, emails, phone numbers and links from raw text.
 */
function stripContactDetails(text: string): string {
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
function condenseForEmbedding(text: string | null | undefined, maxChars: number): string {
  if (!text) return "";

  const cleaned = stripContactDetails(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxChars);
  const lastBreak = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("; "));
  return lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak + 1) : truncated;
}

/** Different meaningful words an answer needs before it counts as an answer. */
const MIN_ANSWER_CONTENT_WORDS = 4;

const ANSWER_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had", "was", "were",
  "you", "your", "will", "are", "not", "but", "all", "can", "could", "would", "should", "did",
  "its", "our", "their", "them", "then", "there", "here", "what", "when", "which", "who",
  "how", "why", "some", "just", "like", "really", "very", "much", "more", "also", "about",
  "yeah", "yes", "okay", "well", "basically", "actually", "maybe", "think", "guess", "know",
  "sure", "another", "question", "answer", "ask", "say", "said", "get", "got", "let", "make",
]);

const NON_ANSWER_MARKERS = [
  "dont know", "do not know", "no idea", "dunno", "not sure", "unsure",
  "no clue", "cant answer", "cannot answer", "skip", "pass on this",
  "next question", "another question", "repeat the question", "no comment",
];

/**
 * Returns the answer only if it says enough to guide the search.
 */
function answerWithTopicSignal(answer: string | null | undefined): string {
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

const QUERY_WEIGHTS = {
  role: 0.15,
  latestAnswer: 0.35,
  jobDescription: 0.25,
  resumeText: 0.25,
} as const;

const MAX_JD_CHARS = 600;
const MAX_RESUME_CHARS = 600;
const MAX_ANSWER_CHARS = 600;

export interface RetrievalQueryParts {
  role: string;
  type: string;
  focusAreas: string;
  jobDescription: string;
  resumeText: string;
  latestAnswer: string;
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

function parseVector(literal: string | null): number[] {
  if (!literal) return [];
  return literal.slice(1, -1).split(",").map(Number);
}

/**
 * Loads excluded question IDs that this candidate has already seen.
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
 * Records used questions to avoid repeating in later turns.
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
 * Maximal Marginal Relevance (MMR) selection over reranked candidates.
 */
function selectWithMmr(
  candidates: {
    row: ScoredRerankedCandidate;
    vector: number[];
  }[],
  limit: number,
  cosineSimilarity: (a: number[], b: number[]) => number,
  mmrLambda = MMR_LAMBDA,
  redundancyThreshold = REDUNDANCY_THRESHOLD
): ScoredRerankedCandidate[] {
  const selected: { row: ScoredRerankedCandidate; vector: number[] }[] = [];

  while (selected.length < limit && candidates.length > 0) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      let maxSimilarityToSelected = 0;

      if (candidate.vector.length > 0) {
        maxSimilarityToSelected = selected.reduce((max, chosen) => {
          if (chosen.vector.length === 0) return max;
          return Math.max(max, cosineSimilarity(candidate.vector, chosen.vector));
        }, 0);
      }

      if (maxSimilarityToSelected >= redundancyThreshold) {
        continue;
      }

      // Relevance score is the fused rerank score
      const score = mmrLambda * candidate.row.fusedScore - (1 - mmrLambda) * maxSimilarityToSelected;
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

/**
 * Core Two-Stage Retrieval & Reranking Workflow.
 */
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

  await recordRetrievedQuestions(session, prisma, selected.map((entry) => entry.id));

  // 7. Trace Logging
  if (ragTracePath()) {
    const selectedQuestions = new Set(selected.map((entry) => entry.question));
    const weightedParts = buildWeightedQueryParts(session);
    const weightTotal = weightedParts.reduce((sum, p) => sum + p.weight, 0) || 1;

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
    });
  }

  return selected;
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
 * Explains why a specific reference question matches the candidate context.
 */
function explainRetrievedMatch(
  q: RetrievedQuestion,
  session?: PromptInterviewSession
): string {
  if (!session) return `Calibrated for ${q.category}`;

  const qLower = q.question.toLowerCase();
  const matchedFocus: string[] = [];

  if (Array.isArray(session.focusAreas)) {
    for (const fa of session.focusAreas) {
      if (typeof fa === "string" && qLower.includes(fa.toLowerCase())) {
        matchedFocus.push(fa);
      }
    }
  }

  if (matchedFocus.length > 0) {
    return `Matches focus on ${matchedFocus.slice(0, 2).join(", ")}`;
  }

  return `Calibrated for ${session.role} · ${q.category}`;
}

/**
 * Formats retrieved reference questions into the system instruction.
 */
export function formatRetrievedQuestions(
  questions: RetrievedQuestion[],
  session?: PromptInterviewSession
): string {
  if (questions.length === 0) {
    return "";
  }

  const lines = questions.map((entry, index) => {
    const why = explainRetrievedMatch(entry, session);
    const parts = [
      `[Reference Question ${index + 1} | ${entry.category}] "${entry.question}"`,
      `  - Why selected: ${why}`,
    ];
    if (entry.answer) {
      parts.push(`  - Evaluation key points: ${entry.answer}`);
    }
    return parts.join("\n");
  });

  return [
    "## INTERNAL REFERENCE QUESTION BANK (For topic & depth calibration only)",
    "These are calibrated reference points to guide what depth to expect.",
    "- Do NOT read these questions verbatim or follow them like a checklist.",
    "- Adapt the core concepts into natural scenario-based questions connected to what the candidate just said.",
    "- Use the evaluation key points to assess technical accuracy and formulate probing follow-ups.",
    "",
    ...lines,
  ].join("\n");
}
