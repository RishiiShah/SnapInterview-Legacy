import { describe, expect, it } from "vitest";
import { selectWithMmr, uncoveredTermGain } from "./retrieval-selection";
import type { ScoredRerankedCandidate } from "./reranker";

function cand(
  id: string,
  question: string,
  fusedScore: number,
  category = "Distributed Systems"
): { row: ScoredRerankedCandidate; vector: number[] } {
  return {
    row: {
      id,
      question,
      answer: null,
      category,
      difficulty: "hard",
      level: "Senior",
      roleTags: ["software-engineer-backend"],
      baseScore: fusedScore,
      rerankScore: fusedScore,
      fusedScore,
    },
    // Orthogonal-ish vectors so cosine redundancy stays low
    vector: id === "a" ? [1, 0, 0] : id === "b" ? [0, 1, 0] : [0, 0, 1],
  };
}

describe("uncoveredTermGain", () => {
  it("scores only terms not yet covered", () => {
    const covered = new Set(["kafka"]);
    expect(
      uncoveredTermGain("kafka redis postgres locking", covered, ["kafka", "redis", "postgres"])
    ).toBeCloseTo(2 / 3, 5);
  });
});

describe("selectWithMmr coverage", () => {
  it("prefers a slightly lower-scoring candidate that covers missing query terms", () => {
    const cosine = (a: number[], b: number[]) => {
      const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
      return Math.max(0, Math.min(1, dot));
    };

    const selected = selectWithMmr(
      [
        cand("a", "Distributed locking across payment workers", 0.92),
        cand("b", "Network partition and split-brain quorum voting", 0.9),
        cand("c", "Redis cache and PostgreSQL transaction isolation", 0.84),
      ],
      2,
      cosine,
      {
        mmrLambda: 0.86,
        coverageTerms: ["redis", "postgres", "kafka", "lock", "cache"],
        coverageWeight: 0.25,
      }
    );

    expect(selected[0].id).toBe("a");
    expect(selected.map((s) => s.id)).toContain("c");
  });

  it("keeps continuity on early picks then fills gap categories later", () => {
    const cosine = (a: number[], b: number[]) => {
      const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
      return Math.max(0, Math.min(1, dot));
    };

    const selected = selectWithMmr(
      [
        {
          ...cand("c1", "Two seniors disagreed on GraphQL versus gRPC", 0.93, "Conflict Resolution"),
          vector: [1, 0, 0, 0],
        },
        {
          ...cand("c2", "How do you decide after architectural disagreement", 0.9, "Conflict Resolution"),
          vector: [0, 1, 0, 0],
        },
        {
          ...cand(
            "collab",
            "How do you collaborate across teams and gather stakeholder feedback",
            0.8,
            "Team Collaboration"
          ),
          vector: [0, 0, 1, 0],
        },
      ],
      3,
      cosine,
      {
        mmrLambda: 0.72,
        continuitySlots: 2,
        gapCategories: ["Team Collaboration"],
        gapCategoryWeight: 0.3,
        coverageTerms: ["feedback", "collaboration", "stakeholder"],
        coverageWeight: 0.2,
      }
    );

    expect(selected[0].category).toBe("Conflict Resolution");
    expect(selected.map((s) => s.id)).toContain("collab");
  });

  it("suppresses near-duplicate wording even with orthogonal vectors", () => {
    const cosine = () => 0;
    const selected = selectWithMmr(
      [
        cand("a", "How do you collaborate with a data science team that had different practices", 0.9),
        cand("b", "Describe collaborating with a data science team that had different practices", 0.89),
        cand("c", "Explain Redis Redlock for payment idempotency", 0.85, "Distributed Systems"),
      ],
      2,
      cosine,
      { mmrLambda: 0.7, nearDupeJaccardThreshold: 0.5 }
    );

    expect(selected.map((s) => s.id)).toEqual(["a", "c"]);
  });
});
