import { describe, expect, it } from "vitest";
import {
  buildGapFillQueries,
  buildInterviewCoverage,
  fuseMultiQueryPools,
} from "./retrieval-coverage";
import type { HybridCandidateRow } from "./hybrid";

describe("buildInterviewCoverage", () => {
  it("marks transcript terms/categories as covered and surfaces gaps vs targets", () => {
    const coverage = buildInterviewCoverage({
      transcript: [
        {
          question: "How do you use React.memo to stop cascading re-renders?",
          answer: "I memoize leaf components and keep state local.",
        },
      ],
      targetTerms: ["react", "memo", "redux", "virtualization", "typescript"],
      targetCategories: ["Front-end", "Web Development", "Languages and Frameworks"],
      targetPillars: ["React Performance", "State Management"],
      activePillar: "React Performance",
    });

    expect(coverage.coveredTerms).toEqual(expect.arrayContaining(["react", "memo"]));
    expect(coverage.missingTerms).toEqual(
      expect.arrayContaining(["redux", "virtualization", "typescript"])
    );
    expect(coverage.missingTerms).not.toContain("react");
    expect(coverage.coveredPillars).toContain("React Performance");
    expect(coverage.missingPillars).toContain("State Management");
  });
});

describe("buildGapFillQueries", () => {
  it("builds dense and sparse gap-fill text from uncovered targets", () => {
    const coverage = buildInterviewCoverage({
      transcript: [],
      targetTerms: ["kafka", "redis", "postgres"],
      targetCategories: ["Distributed Systems", "Database and SQL"],
      targetPillars: ["Event Streaming"],
      activePillar: "",
    });

    const gap = buildGapFillQueries(coverage, {
      role: "Backend Engineer",
      interviewType: "system-design",
    });

    expect(gap).not.toBeNull();
    expect(gap!.denseQuery).toMatch(/kafka/i);
    expect(gap!.denseQuery).toMatch(/Distributed Systems|Database/i);
    expect(gap!.sparseKeywords.toLowerCase()).toContain("redis");
  });

  it("returns null when everything targetable is already covered", () => {
    const coverage = buildInterviewCoverage({
      transcript: [
        {
          question: "Explain Kafka consumer groups with Redis locks and Postgres transactions in distributed systems.",
          answer: "We use Kafka, Redis, and Postgres together in distributed systems.",
        },
      ],
      targetTerms: ["kafka", "redis", "postgres"],
      targetCategories: ["Distributed Systems"],
      targetPillars: [],
      activePillar: "",
    });

    expect(buildGapFillQueries(coverage, { role: "Backend", interviewType: "system-design" })).toBeNull();
  });
});

describe("fuseMultiQueryPools", () => {
  it("RRF-fuses parallel query branches and prefers multi-list hits", () => {
    const mk = (id: string, score: number): HybridCandidateRow => ({
      id,
      question: id,
      answer: null,
      category: "Distributed Systems",
      difficulty: "hard",
      level: "Senior",
      roleTags: [],
      types: ["system-design"],
      embedding: null,
      similarity: score,
      rrfScore: score,
    });

    const fused = fuseMultiQueryPools(
      [
        { label: "conversational", weight: 0.5, rows: [mk("a", 0.9), mk("b", 0.8)] },
        { label: "gapFill", weight: 0.5, rows: [mk("b", 0.9), mk("c", 0.85)] },
      ],
      3
    );

    expect(fused.map((r) => r.id)[0]).toBe("b");
    expect(fused.map((r) => r.id)).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });
});
