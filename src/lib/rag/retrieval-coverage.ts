import type { HybridCandidateRow } from "@/lib/rag/hybrid";
import { extractKeyTechnicalTerms } from "@/lib/rag/chunker";
import { TERM_CATEGORY_HINTS } from "@/lib/rag/retrieval-categories";

export type InterviewCoverage = {
  coveredTerms: string[];
  missingTerms: string[];
  coveredCategories: string[];
  missingCategories: string[];
  coveredPillars: string[];
  missingPillars: string[];
};

export type GapFillQueries = {
  denseQuery: string;
  sparseKeywords: string;
};

export type MultiQueryBranch = {
  label: "conversational" | "agenda" | "gapFill";
  weight: number;
  rows: HybridCandidateRow[];
};

const DEFAULT_RRF_K = 60;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function pillarKey(value: string): string {
  return normalizeToken(value);
}

/**
 * Builds target technical terms from resume/dialogue seeds plus known domain hints
 * that appear in those seeds (so we don't target the entire synonym dictionary).
 */
export function collectTargetTerms(seedTexts: string[]): string[] {
  const seeds = seedTexts.filter(Boolean).join(" ");
  const extracted = extractKeyTechnicalTerms(seeds).map((t) => t.toLowerCase());
  const hinted: string[] = [];
  const lower = seeds.toLowerCase();
  for (const term of Object.keys(TERM_CATEGORY_HINTS)) {
    if (lower.includes(term)) hinted.push(term);
  }
  return [...new Set([...extracted, ...hinted].filter((t) => t.length >= 3))].slice(0, 40);
}

/**
 * Tracks what the interview has already covered vs what it still needs.
 */
export function buildInterviewCoverage(input: {
  transcript?: Array<{ question: string; answer: string }>;
  targetTerms: string[];
  targetCategories: string[];
  targetPillars: string[];
  activePillar?: string;
}): InterviewCoverage {
  const transcriptText = (input.transcript ?? [])
    .map((entry) => `${entry.question} ${entry.answer}`)
    .join(" ")
    .toLowerCase();

  const coveredTermSet = new Set<string>();
  for (const term of input.targetTerms) {
    const normalized = normalizeToken(term);
    if (normalized.length >= 3 && transcriptText.includes(normalized)) {
      coveredTermSet.add(normalized);
    }
  }

  const coveredCategorySet = new Set<string>();
  for (const category of input.targetCategories) {
    const tokens = normalizeToken(category)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3);
    if (tokens.some((token) => transcriptText.includes(token))) {
      coveredCategorySet.add(category);
    }
  }

  const coveredPillarSet = new Set<string>();
  if (input.activePillar?.trim()) {
    coveredPillarSet.add(input.activePillar.trim());
  }
  for (const pillar of input.targetPillars) {
    const key = pillarKey(pillar);
    if (key && transcriptText.includes(key)) {
      coveredPillarSet.add(pillar);
    }
  }

  const missingTerms = input.targetTerms
    .map(normalizeToken)
    .filter((term) => term.length >= 3 && !coveredTermSet.has(term));
  const missingCategories = input.targetCategories.filter(
    (category) => !coveredCategorySet.has(category)
  );
  const missingPillars = input.targetPillars.filter(
    (pillar) => ![...coveredPillarSet].some((c) => pillarKey(c) === pillarKey(pillar))
  );

  return {
    coveredTerms: [...coveredTermSet],
    missingTerms: [...new Set(missingTerms)].slice(0, 16),
    coveredCategories: [...coveredCategorySet],
    missingCategories: missingCategories.slice(0, 8),
    coveredPillars: [...coveredPillarSet],
    missingPillars: missingPillars.slice(0, 6),
  };
}

/**
 * Builds a retrieval query aimed at uncovered interview topics.
 * Returns null when there is nothing meaningful left to fill.
 */
export function buildGapFillQueries(
  coverage: InterviewCoverage,
  context: { role: string; interviewType: string }
): GapFillQueries | null {
  const terms = coverage.missingTerms.slice(0, 10);
  const categories = coverage.missingCategories.slice(0, 4);
  const pillars = coverage.missingPillars.slice(0, 3);

  if (terms.length === 0 && categories.length === 0 && pillars.length === 0) {
    return null;
  }

  const denseParts = [
    `A ${context.interviewType} interview for a ${context.role} role.`,
    "Retrieve questions that cover these uncovered topics:",
    terms.length > 0 ? `Keywords: ${terms.join(", ")}.` : "",
    categories.length > 0 ? `Categories: ${categories.join(", ")}.` : "",
    pillars.length > 0 ? `Agenda pillars still needed: ${pillars.join(", ")}.` : "",
  ].filter(Boolean);

  return {
    denseQuery: denseParts.join(" ").slice(0, 900),
    sparseKeywords: [...terms, ...categories, ...pillars].join(" "),
  };
}

/**
 * Builds the agenda-focused dense/sparse queries from the active pillar and focus areas.
 */
export function buildAgendaQueries(input: {
  role: string;
  interviewType: string;
  activePillar: string;
  focusAreas: string;
  levelHint?: string;
}): GapFillQueries | null {
  if (!input.activePillar.trim() && !input.focusAreas.trim()) {
    return null;
  }

  const denseQuery = [
    `A ${input.interviewType} interview for a ${input.role} role.`,
    input.activePillar ? `Current agenda pillar: ${input.activePillar}.` : "",
    input.focusAreas ? `Focus areas: ${input.focusAreas}.` : "",
    input.levelHint ?? "",
    "Ask deep follow-up interview questions aligned to this agenda.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 900);

  return {
    denseQuery,
    sparseKeywords: [input.activePillar, input.focusAreas].filter(Boolean).join(" "),
  };
}

/**
 * Reciprocal Rank Fusion across parallel retrieval branches.
 * Candidates appearing in multiple lists rise; best similarity/rrf from any branch is kept.
 */
export function fuseMultiQueryPools(
  branches: MultiQueryBranch[],
  limit: number,
  rrfK = DEFAULT_RRF_K
): HybridCandidateRow[] {
  const active = branches.filter((branch) => branch.rows.length > 0 && branch.weight > 0);
  if (active.length === 0) return [];
  if (active.length === 1) {
    return active[0].rows.slice(0, limit);
  }

  const weightSum = active.reduce((sum, branch) => sum + branch.weight, 0) || 1;
  const byId = new Map<
    string,
    {
      row: HybridCandidateRow;
      fusedRrf: number;
      bestSimilarity: number;
    }
  >();

  for (const branch of active) {
    const normalizedWeight = branch.weight / weightSum;
    for (let i = 0; i < branch.rows.length; i++) {
      const row = branch.rows[i];
      const contribution = normalizedWeight / (rrfK + i + 1);
      const existing = byId.get(row.id);
      const similarity = row.similarity ?? 0;
      if (!existing) {
        byId.set(row.id, {
          row: { ...row, rrfScore: contribution },
          fusedRrf: contribution,
          bestSimilarity: similarity,
        });
      } else {
        existing.fusedRrf += contribution;
        if (similarity > existing.bestSimilarity) {
          existing.bestSimilarity = similarity;
          existing.row = {
            ...row,
            rrfScore: existing.fusedRrf,
            similarity: row.similarity ?? existing.row.similarity,
            denseRank: row.denseRank ?? existing.row.denseRank,
            sparseRank: row.sparseRank ?? existing.row.sparseRank,
            embedding: row.embedding ?? existing.row.embedding,
          };
        } else {
          existing.row = { ...existing.row, rrfScore: existing.fusedRrf };
        }
      }
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.fusedRrf - a.fusedRrf || b.bestSimilarity - a.bestSimilarity)
    .slice(0, limit)
    .map((entry) => ({
      ...entry.row,
      rrfScore: entry.fusedRrf,
      similarity: entry.row.similarity ?? entry.bestSimilarity,
    }));
}
