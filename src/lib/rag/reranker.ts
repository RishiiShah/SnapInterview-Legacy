import { logger } from "@/utils/logger";
import { extractKeyTechnicalTerms } from "./chunker";

export interface RerankerCandidate {
  id: string;
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  roleTags: string[];
  types?: string[];
  baseScore: number;
}

export interface ScoredRerankedCandidate extends RerankerCandidate {
  rerankScore: number;
  fusedScore: number;
}

const RERANKER_MODEL_ID = "Xenova/ms-marco-MiniLM-L-6-v2";
const RERANK_TIMEOUT_MS = 450;

type ClassificationPipeline = (
  inputs: Array<{ text: string; text_pair: string }>,
  options?: { topk?: number }
) => Promise<Array<Array<{ label: string; score: number }> | { label: string; score: number }>>;

let rerankerPromise: Promise<ClassificationPipeline> | null = null;

/**
 * Loads the ONNX cross-encoder model once per process and caches it.
 */
function getRerankerPipeline(): Promise<ClassificationPipeline> {
  if (rerankerPromise) {
    return rerankerPromise;
  }

  rerankerPromise = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");

    if (process.env.VERCEL) {
      env.cacheDir = "/tmp/transformers-cache";
    }

    const started = Date.now();
    const classifier = (await pipeline(
      "text-classification",
      RERANKER_MODEL_ID
    )) as unknown as ClassificationPipeline;

    logger.info("Loaded cross-encoder reranker model", {
      model: RERANKER_MODEL_ID,
      loadMs: Date.now() - started,
    });
    return classifier;
  })();

  rerankerPromise.catch(() => {
    rerankerPromise = null;
  });

  return rerankerPromise;
}

/**
 * Warms up the cross-encoder reranker ahead of retrieval.
 */
export function warmRerankerModel(): void {
  void getRerankerPipeline().catch((error) => {
    logger.warn("Reranker model warmup failed", {
      model: RERANKER_MODEL_ID,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/**
 * Calibrated Heuristic Cross-Scorer (zero-latency resilient scoring engine).
 * Evaluates technical keyword overlap, n-gram matching, role alignment, and difficulty match.
 */
export function computeHeuristicRerankScore(
  query: string,
  candidate: RerankerCandidate,
  targetRoleSlug?: string
): number {
  const queryLower = query.toLowerCase();
  const questionLower = candidate.question.toLowerCase();
  const answerLower = (candidate.answer ?? "").toLowerCase();
  const categoryLower = candidate.category.toLowerCase();
  const combinedDoc = `${questionLower} ${answerLower} ${categoryLower}`;

  // 1. Technical & Domain Keyword Overlap
  const queryTerms = extractKeyTechnicalTerms(query).map((t) => t.toLowerCase());
  let matchedTerms = 0;
  let questionMatches = 0;

  for (const term of queryTerms) {
    if (questionLower.includes(term)) {
      questionMatches += 2.0;
      matchedTerms++;
    } else if (combinedDoc.includes(term)) {
      matchedTerms++;
    }
  }

  // Evaluate query coverage with focus on top matched concepts (min 4 terms)
  const effectiveTermDivisor = Math.max(Math.min(queryTerms.length, 5), 1);
  const termScore = queryTerms.length > 0
    ? Math.min((matchedTerms + questionMatches * 0.8) / effectiveTermDivisor, 1.0)
    : 0.5;

  // 2. Exact Phrase / Token Matching
  const queryWords = queryLower
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS_SET.has(w));

  let wordMatches = 0;
  for (const word of queryWords) {
    if (questionLower.includes(word)) {
      wordMatches += 2.0; // Direct question matches carry highest relevance
    } else if (categoryLower.includes(word)) {
      wordMatches += 1.2;
    } else if (answerLower.includes(word)) {
      wordMatches += 0.8;
    }
  }
  const effectiveWordDivisor = Math.max(Math.min(queryWords.length, 6), 1);
  const phraseScore = queryWords.length > 0
    ? Math.min(wordMatches / effectiveWordDivisor, 1.0)
    : 0.5;

  // 3. Role Tag & Category Match Boost (Behavioral questions are role-agnostic so give equal baseline)
  let roleBoost = 0;
  if (targetRoleSlug && candidate.roleTags?.includes(targetRoleSlug)) {
    roleBoost = 0.15;
  } else if (!candidate.roleTags || candidate.roleTags.length === 0) {
    roleBoost = 0.12; // Fair baseline for role-agnostic behavioral questions
  }

  // 4. Base Vector / RRF Score influence
  const baseNorm = Math.min(Math.max(candidate.baseScore, 0), 1.0);

  // Combine into calibrated [0, 1] range
  const rawScore = 0.20 * baseNorm + 0.40 * termScore + 0.28 * phraseScore + roleBoost;
  return Number(Math.min(Math.max(rawScore, 0), 1.0).toFixed(4));
}

const STOP_WORDS_SET = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "by", "for", "with",
  "about", "to", "from", "is", "are", "was", "were", "be", "been", "have", "has",
  "you", "your", "it", "its", "they", "their", "what", "when", "which", "how", "why",
  "candidate", "response", "discussion", "background", "interview", "interviewer",
  "role", "question", "questions", "describe", "explain", "focusing", "experience",
  "answer", "skills", "tools", "topic", "focus", "area", "context", "requirements",
  "behavioral", "leadership", "developer", "engineer", "engineering", "manager",
]);

/**
 * Reranks candidate questions using a cross-encoder model with fallback to calibrated scoring.
 */
export async function rerankCandidates(
  query: string,
  candidates: RerankerCandidate[],
  options: {
    targetRoleSlug?: string;
    topK?: number;
    timeoutMs?: number;
    useModel?: boolean;
  } = {}
): Promise<ScoredRerankedCandidate[]> {
  if (candidates.length === 0) return [];

  const topK = options.topK ?? candidates.length;
  const timeoutMs = options.timeoutMs ?? RERANK_TIMEOUT_MS;
  const useModel = options.useModel ?? (process.env.NODE_ENV !== "test" && !process.env.DISABLE_RERANKER_MODEL);

  if (!useModel) {
    return candidates
      .map((cand) => {
        const rerankScore = computeHeuristicRerankScore(query, cand, options.targetRoleSlug);
        // Cross-attention / heuristic rerank score provides authoritative precision ranking
        const fusedScore = Number((0.20 * cand.baseScore + 0.80 * rerankScore).toFixed(4));
        return {
          ...cand,
          rerankScore,
          fusedScore,
        };
      })
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, topK);
  }

  try {
    const rerankPromise = (async () => {
      const classifier = await getRerankerPipeline();
      const inputs = candidates.map((c) => ({
        text: query,
        text_pair: c.answer ? `${c.question} — Answer: ${c.answer}` : c.question,
      }));

      const outputs = await classifier(inputs);
      const results: ScoredRerankedCandidate[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        const out = outputs[i];
        let modelScore = 0.5;

        if (Array.isArray(out) && out[0]) {
          modelScore = out[0].score;
        } else if (out && typeof out === "object" && "score" in out) {
          modelScore = (out as { score: number }).score;
        }

        const heuristic = computeHeuristicRerankScore(query, cand, options.targetRoleSlug);
        // Blend model score (70%) with heuristic keyword validation (30%)
        const rerankScore = Number((0.7 * modelScore + 0.3 * heuristic).toFixed(4));
        const fusedScore = Number((0.20 * cand.baseScore + 0.80 * rerankScore).toFixed(4));

        results.push({
          ...cand,
          rerankScore,
          fusedScore,
        });
      }

      return results.sort((a, b) => b.fusedScore - a.fusedScore).slice(0, topK);
    })();

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<ScoredRerankedCandidate[]>((resolve) => {
      timeoutHandle = setTimeout(() => {
        logger.warn("Reranker model timed out; falling back to heuristic scoring", {
          candidatesCount: candidates.length,
          timeoutMs,
        });
        const fallbackResults = candidates
          .map((cand) => {
            const rerankScore = computeHeuristicRerankScore(query, cand, options.targetRoleSlug);
            const fusedScore = Number((0.20 * cand.baseScore + 0.80 * rerankScore).toFixed(4));
            return { ...cand, rerankScore, fusedScore };
          })
          .sort((a, b) => b.fusedScore - a.fusedScore)
          .slice(0, topK);
        resolve(fallbackResults);
      }, timeoutMs);
    });

    const finalResults = await Promise.race([rerankPromise, timeoutPromise]);
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    return finalResults;
  } catch (error) {
    logger.warn("Reranker execution failed; falling back to heuristic scoring", {
      error: error instanceof Error ? error.message : String(error),
    });

    return candidates
      .map((cand) => {
        const rerankScore = computeHeuristicRerankScore(query, cand, options.targetRoleSlug);
        const fusedScore = Number((0.20 * cand.baseScore + 0.80 * rerankScore).toFixed(4));
        return { ...cand, rerankScore, fusedScore };
      })
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, topK);
  }
}
