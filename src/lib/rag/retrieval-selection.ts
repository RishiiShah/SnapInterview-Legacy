import type { ScoredRerankedCandidate } from "@/lib/rag/reranker";

/** Two questions this similar are treated as redundant. */
export const REDUNDANCY_THRESHOLD = 0.82;
/** Balances relevance against variety when picking the final set. */
export const MMR_LAMBDA = 0.72;

export function parseVector(literal: string | null): number[] {
  if (!literal) return [];
  return literal.slice(1, -1).split(",").map(Number);
}

/**
 * Maximal Marginal Relevance (MMR) selection over reranked candidates.
 */
export function selectWithMmr(
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
