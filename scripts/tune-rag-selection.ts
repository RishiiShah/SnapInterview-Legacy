/**
 * Offline selection-weight tuner for SnapInterview RAG.
 *
 * Grids a small set of MMR / gap-fill weights against fixture candidates that
 * mirror the behavioral multi-turn failure mode (continuity vs collaboration gap).
 *
 * Usage:
 *   npm run rag:tune
 */

import {
  MMR_CONTINUITY_SLOTS,
  MMR_COVERAGE_WEIGHT,
  MMR_GAP_CATEGORY_WEIGHT,
  MMR_LAMBDA,
  selectWithMmr,
} from "../src/lib/rag/retrieval-selection";
import type { ScoredRerankedCandidate } from "../src/lib/rag/reranker";

function cand(
  id: string,
  question: string,
  category: string,
  fusedScore: number,
  vector: number[]
): { row: ScoredRerankedCandidate; vector: number[] } {
  return {
    row: {
      id,
      question,
      answer: null,
      category,
      difficulty: "hard",
      level: "Senior",
      roleTags: [],
      baseScore: fusedScore,
      rerankScore: fusedScore,
      fusedScore,
    },
    vector,
  };
}

const FIXTURES = [
  cand(
    "conflict-1",
    "Tell me about a time two senior engineers strongly disagreed on an implementation",
    "Conflict Resolution",
    0.92,
    [1, 0, 0, 0]
  ),
  cand(
    "conflict-2",
    "How did you break a stalemate when leads disagreed on GraphQL versus gRPC",
    "Conflict Resolution",
    0.9,
    [0.95, 0.05, 0, 0]
  ),
  cand(
    "leadership-1",
    "Walk me through leading an engineering team through a hard architectural decision",
    "Leadership",
    0.88,
    [0, 1, 0, 0]
  ),
  cand(
    "collab-1",
    "Describe collaborating across teams and gathering stakeholder feedback after a tough call",
    "Team Collaboration",
    0.8,
    [0, 0, 1, 0]
  ),
  cand(
    "feedback-1",
    "How do you give peer feedback and keep collaboration healthy after conflict",
    "Team Collaboration",
    0.78,
    [0, 0, 0, 1]
  ),
];

const EXPECTED_GAP_KEYWORDS = ["collaboration", "feedback", "stakeholder"];

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0)) || 1;
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0)) || 1;
  return Math.max(0, Math.min(1, dot / (magA * magB)));
}

function keywordRecall(selected: ScoredRerankedCandidate[]): number {
  const bag = selected.map((q) => q.question.toLowerCase()).join(" ");
  let hit = 0;
  for (const kw of EXPECTED_GAP_KEYWORDS) {
    if (bag.includes(kw)) hit++;
  }
  return hit / EXPECTED_GAP_KEYWORDS.length;
}

function scorePreset(params: {
  mmrLambda: number;
  coverageWeight: number;
  gapCategoryWeight: number;
  continuitySlots: number;
}): { keywordRecall: number; topIds: string[] } {
  const selected = selectWithMmr(FIXTURES, 6, cosine, {
    mmrLambda: params.mmrLambda,
    coverageWeight: params.coverageWeight,
    coverageTerms: ["feedback", "collaboration", "stakeholder", "conflict", "decision"],
    gapCategories: ["Team Collaboration", "Work Style"],
    gapCategoryWeight: params.gapCategoryWeight,
    continuitySlots: params.continuitySlots,
  });
  return {
    keywordRecall: keywordRecall(selected),
    topIds: selected.map((s) => s.id),
  };
}

function main() {
  const grid = [
    {
      label: "current-defaults",
      mmrLambda: MMR_LAMBDA,
      coverageWeight: MMR_COVERAGE_WEIGHT,
      gapCategoryWeight: MMR_GAP_CATEGORY_WEIGHT,
      continuitySlots: MMR_CONTINUITY_SLOTS,
    },
    {
      label: "behavioral-strong-gap",
      mmrLambda: 0.72,
      coverageWeight: 0.2,
      gapCategoryWeight: 0.3,
      continuitySlots: 2,
    },
    {
      label: "continuity-heavy",
      mmrLambda: 0.86,
      coverageWeight: 0.12,
      gapCategoryWeight: 0.12,
      continuitySlots: 3,
    },
    {
      label: "gap-aggressive",
      mmrLambda: 0.68,
      coverageWeight: 0.22,
      gapCategoryWeight: 0.36,
      continuitySlots: 2,
    },
  ];

  console.log("================================================================================");
  console.log("  RAG selection weight tuner (offline fixture: behavioral gap-fill)");
  console.log("================================================================================\n");

  let best = grid[0];
  let bestScore = -1;

  for (const preset of grid) {
    const result = scorePreset(preset);
    console.log(`${preset.label}`);
    console.log(`  lambda=${preset.mmrLambda} coverageW=${preset.coverageWeight} gapW=${preset.gapCategoryWeight} continuity=${preset.continuitySlots}`);
    console.log(`  keywordRecall=${(result.keywordRecall * 100).toFixed(1)}%`);
    console.log(`  top6=${result.topIds.join(", ")}`);
    console.log("");
    if (result.keywordRecall > bestScore) {
      bestScore = result.keywordRecall;
      best = preset;
    }
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`Best fixture preset: ${best.label} (keywordRecall=${(bestScore * 100).toFixed(1)}%)`);
  console.log("Production already uses continuitySlots=2 and elevated behavioral gapCategoryWeight=0.3.");
  console.log("Re-run `npm run rag:benchmark` after selection changes to validate live corpus quality.");
  console.log("================================================================================\n");
}

main();
