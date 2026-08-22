import type { ScoredRerankedCandidate } from "@/lib/rag/reranker";
import { categoryMatchesPreferred } from "@/lib/rag/retrieval-categories";

/** Two questions this similar (by embedding cosine) are treated as redundant. */
export const REDUNDANCY_THRESHOLD = 0.82;
/** Near-duplicate question text Jaccard threshold (token overlap). */
export const NEAR_DUPE_JACCARD_THRESHOLD = 0.55;
/** Balances relevance against variety when picking the final set. */
export const MMR_LAMBDA = 0.72;
/** How strongly uncovered query terms influence later MMR picks. */
export const MMR_COVERAGE_WEIGHT = 0.18;
/** How strongly missing categories influence picks after continuity slots. */
export const MMR_GAP_CATEGORY_WEIGHT = 0.24;
/** Keep the first N picks continuity-first; later picks may fill agenda gaps. */
export const MMR_CONTINUITY_SLOTS = 2;

export function parseVector(literal: string | null): number[] {
  if (!literal) return [];
  return literal.slice(1, -1).split(",").map(Number);
}

/**
 * Returns a minimal text fingerprint for duplicate detection when vectors are absent.
 * Lowercases and collapses whitespace so near-identical phrasing is caught.
 */
function textFingerprint(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
}

function candidateText(row: ScoredRerankedCandidate): string {
  return `${row.question} ${row.answer ?? ""} ${row.category}`.toLowerCase();
}

/** Significant content tokens for near-dupe detection. */
export function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3)
  );
}

/** Jaccard similarity over significant tokens. */
export function tokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Fraction of query terms present in text that are not already covered.
 */
export function uncoveredTermGain(
  text: string,
  coveredTerms: Set<string>,
  queryTerms: string[]
): number {
  if (queryTerms.length === 0) return 0;
  const lower = text.toLowerCase();
  let gained = 0;
  let eligible = 0;
  for (const raw of queryTerms) {
    const term = raw.trim().toLowerCase();
    if (term.length < 3) continue;
    eligible++;
    if (coveredTerms.has(term)) continue;
    if (lower.includes(term)) gained++;
  }
  return eligible > 0 ? gained / eligible : 0;
}

function markCoveredTerms(text: string, coveredTerms: Set<string>, queryTerms: string[]): void {
  const lower = text.toLowerCase();
  for (const raw of queryTerms) {
    const term = raw.trim().toLowerCase();
    if (term.length < 3) continue;
    if (lower.includes(term)) coveredTerms.add(term);
  }
}

export function gapCategoryGain(
  category: string,
  gapCategories: string[],
  selectedCount: number,
  continuitySlots: number
): number {
  if (selectedCount < continuitySlots || gapCategories.length === 0) return 0;
  const match = categoryMatchesPreferred(category, gapCategories);
  if (match === "exact") return 1;
  if (match === "soft") return 0.5;
  return 0;
}

export type MmrSelectionOptions = {
  mmrLambda?: number;
  redundancyThreshold?: number;
  nearDupeJaccardThreshold?: number;
  /** Technical terms from the live query; later picks prefer uncovered terms. */
  coverageTerms?: string[];
  coverageWeight?: number;
  /** Categories still missing from the interview agenda / coverage tracker. */
  gapCategories?: string[];
  gapCategoryWeight?: number;
  /** First N picks stay continuity-first (conversational relevance). */
  continuitySlots?: number;
};

/**
 * Maximal Marginal Relevance (MMR) selection over reranked candidates.
 *
 * - Deduplicates by question ID before the loop so the same DB row never appears twice.
 * - Candidates without an embedding vector fall back to text-fingerprint comparison
 *   instead of cosine similarity to prevent identical questions being selected twice.
 * - Optional coverageTerms / gapCategories nudge later picks toward uncovered topics.
 * - Near-duplicate question wording is suppressed via token Jaccard.
 */
export function selectWithMmr(
  candidates: {
    row: ScoredRerankedCandidate;
    vector: number[];
  }[],
  limit: number,
  cosineSimilarity: (a: number[], b: number[]) => number,
  mmrLambdaOrOptions: number | MmrSelectionOptions = MMR_LAMBDA,
  redundancyThresholdArg = REDUNDANCY_THRESHOLD
): ScoredRerankedCandidate[] {
  const options: MmrSelectionOptions =
    typeof mmrLambdaOrOptions === "number"
      ? { mmrLambda: mmrLambdaOrOptions, redundancyThreshold: redundancyThresholdArg }
      : mmrLambdaOrOptions;

  const mmrLambda = options.mmrLambda ?? MMR_LAMBDA;
  const redundancyThreshold = options.redundancyThreshold ?? REDUNDANCY_THRESHOLD;
  const nearDupeThreshold = options.nearDupeJaccardThreshold ?? NEAR_DUPE_JACCARD_THRESHOLD;
  const coverageTerms = options.coverageTerms ?? [];
  const coverageWeight =
    coverageTerms.length > 0 ? (options.coverageWeight ?? MMR_COVERAGE_WEIGHT) : 0;
  const gapCategories = options.gapCategories ?? [];
  const gapCategoryWeight =
    gapCategories.length > 0 ? (options.gapCategoryWeight ?? MMR_GAP_CATEGORY_WEIGHT) : 0;
  const continuitySlots = options.continuitySlots ?? MMR_CONTINUITY_SLOTS;

  // Deduplicate by ID — same DB row must never appear twice in the pool.
  const seenIds = new Set<string>();
  const deduped = candidates.filter(({ row }) => {
    if (seenIds.has(row.id)) return false;
    seenIds.add(row.id);
    return true;
  });

  const selected: {
    row: ScoredRerankedCandidate;
    vector: number[];
    fingerprint: string;
    tokens: Set<string>;
  }[] = [];
  const coveredTerms = new Set<string>();

  while (selected.length < limit && deduped.length > 0) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < deduped.length; i++) {
      const candidate = deduped[i];
      const candTokens = significantTokens(candidate.row.question);
      let maxSimilarityToSelected = 0;

      if (candidate.vector.length > 0) {
        maxSimilarityToSelected = selected.reduce((max, chosen) => {
          if (chosen.vector.length === 0) return max;
          return Math.max(max, cosineSimilarity(candidate.vector, chosen.vector));
        }, 0);
      } else {
        const fp = textFingerprint(candidate.row.question);
        const isTextDuplicate = selected.some((chosen) => chosen.fingerprint === fp);
        maxSimilarityToSelected = isTextDuplicate ? 1.0 : 0;
      }

      // Near-dupe wording (paraphrase / repeated stem) — treat as redundant.
      const maxNearDupe = selected.reduce(
        (max, chosen) => Math.max(max, tokenJaccard(candTokens, chosen.tokens)),
        0
      );
      if (maxNearDupe >= nearDupeThreshold) {
        maxSimilarityToSelected = Math.max(maxSimilarityToSelected, 0.95);
      }

      if (maxSimilarityToSelected >= redundancyThreshold) {
        continue;
      }

      const coverageGain =
        selected.length === 0
          ? 0
          : uncoveredTermGain(candidateText(candidate.row), coveredTerms, coverageTerms);
      const categoryGain = gapCategoryGain(
        candidate.row.category,
        gapCategories,
        selected.length,
        continuitySlots
      );

      const score =
        mmrLambda * candidate.row.fusedScore +
        coverageWeight * coverageGain +
        gapCategoryWeight * categoryGain -
        (1 - mmrLambda) * maxSimilarityToSelected;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      break;
    }

    const chosen = deduped[bestIndex];
    selected.push({
      ...chosen,
      fingerprint: textFingerprint(chosen.row.question),
      tokens: significantTokens(chosen.row.question),
    });
    markCoveredTerms(candidateText(chosen.row), coveredTerms, coverageTerms);
    deduped.splice(bestIndex, 1);
  }

  return selected.map((entry) => entry.row);
}
