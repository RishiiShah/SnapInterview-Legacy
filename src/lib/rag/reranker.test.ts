import { describe, expect, it } from "vitest";
import {
  computeHeuristicRerankScore,
  rerankCandidates,
  type RerankerCandidate,
} from "./reranker";

describe("computeHeuristicRerankScore", () => {
  const candidates: RerankerCandidate[] = [
    {
      id: "q1",
      question: "How do you optimize React re-renders using useMemo, useCallback, and React.memo?",
      answer: "Use memoization hooks and immutable data structures to prevent cascading component re-renders.",
      category: "Front-end",
      difficulty: "medium",
      roleTags: ["software-engineer-frontend"],
      baseScore: 0.5,
    },
    {
      id: "q2",
      question: "Design a distributed database with multi-region replication and Raft consensus.",
      answer: "Use Paxos or Raft protocol with write-ahead logs and quorum reads/writes.",
      category: "Distributed Systems",
      difficulty: "hard",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.5,
    },
  ];

  it("gives higher relevance to candidate matching query keywords and role tags", () => {
    const query = "React Developer. Discussing component re-renders, performance tuning, and memoization.";
    const score1 = computeHeuristicRerankScore(query, candidates[0], "software-engineer-frontend");
    const score2 = computeHeuristicRerankScore(query, candidates[1], "software-engineer-frontend");

    expect(score1).toBeGreaterThan(score2);
    expect(score1).toBeGreaterThan(0.6);
  });
});

describe("rerankCandidates", () => {
  const candidates: RerankerCandidate[] = [
    {
      id: "q1",
      question: "Explain database indexing and B-tree vs LSM-tree structures.",
      answer: "B-trees are read-optimized whereas LSM-trees are write-optimized with SSTables.",
      category: "Database and SQL",
      difficulty: "medium",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.4,
    },
    {
      id: "q2",
      question: "How does Kubernetes handle horizontal pod autoscaling based on custom metrics?",
      answer: "HPA queries metric server via custom metrics API and adjusts replica counts.",
      category: "DevOps",
      difficulty: "hard",
      roleTags: ["devops-cloud-engineer"],
      baseScore: 0.6,
    },
  ];

  it("reranks candidates according to the query domain and returns ordered scored list", async () => {
    const query = "Postgres indexing, LSM tree storage engines, and database query optimization.";
    const results = await rerankCandidates(query, candidates, {
      targetRoleSlug: "software-engineer-backend",
      useModel: false,
    });

    expect(results.length).toBe(2);
    expect(results[0].id).toBe("q1"); // q1 moves to #1 despite lower baseScore
    expect(results[0].fusedScore).toBeGreaterThan(results[1].fusedScore);
  });

  it("handles empty candidates array gracefully", async () => {
    const results = await rerankCandidates("query", [], { useModel: false });
    expect(results).toEqual([]);
  });
});
