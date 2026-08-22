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
      level: "Mid",
      roleTags: ["software-engineer-frontend"],
      baseScore: 0.5,
    },
    {
      id: "q2",
      question: "Design a distributed database with multi-region replication and Raft consensus.",
      answer: "Use Paxos or Raft protocol with write-ahead logs and quorum reads/writes.",
      category: "Distributed Systems",
      difficulty: "hard",
      level: "Senior",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.5,
    },
  ];

  it("gives higher relevance to candidate matching query keywords and role tags", () => {
    const query = "React Developer. Discussing component re-renders, performance tuning, and memoization.";
    const score1 = computeHeuristicRerankScore(query, candidates[0], {
      targetRoleSlug: "software-engineer-frontend",
    });
    const score2 = computeHeuristicRerankScore(query, candidates[1], {
      targetRoleSlug: "software-engineer-frontend",
    });

    expect(score1).toBeGreaterThan(score2);
    expect(score1).toBeGreaterThan(0.6);
  });

  it("applies difficulty calibration boost for matching levels and penalizes severe mismatches", () => {
    const query = "Backend architecture and high-throughput systems.";
    const easyCandidate: RerankerCandidate = {
      id: "easy-q",
      question: "What is a database?",
      answer: "A database is an organized collection of data.",
      category: "Database and SQL",
      difficulty: "easy",
      level: "Junior",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.5,
    };
    const hardCandidate: RerankerCandidate = {
      id: "hard-q",
      question: "What is a database transaction isolation level and how do you prevent write skew?",
      answer: "Use serializable isolation or 2-phase locking with snapshot isolation.",
      category: "Database and SQL",
      difficulty: "hard",
      level: "Senior",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.5,
    };

    // When targeting a hard staff round
    const hardScore = computeHeuristicRerankScore(query, hardCandidate, {
      targetRoleSlug: "software-engineer-backend",
      targetDifficulty: "hard",
    });
    const easyScoreInHardRound = computeHeuristicRerankScore(query, easyCandidate, {
      targetRoleSlug: "software-engineer-backend",
      targetDifficulty: "hard",
    });
    expect(hardScore).toBeGreaterThan(easyScoreInHardRound);

    // When targeting an entry-level easy round
    const easyScoreInEasyRound = computeHeuristicRerankScore("What is a database?", easyCandidate, {
      targetRoleSlug: "software-engineer-backend",
      targetDifficulty: "easy",
    });
    const hardScoreInEasyRound = computeHeuristicRerankScore("What is a database?", hardCandidate, {
      targetRoleSlug: "software-engineer-backend",
      targetDifficulty: "easy",
    });
    expect(easyScoreInEasyRound).toBeGreaterThan(hardScoreInEasyRound);
  });

  it("boosts preferred categories and aligned candidate levels", () => {
    const query = "Frontend React performance and virtualization.";
    const frontend: RerankerCandidate = {
      id: "fe",
      question: "How do you virtualize long lists in React?",
      answer: "Use windowing and recycled rows.",
      category: "Front-end",
      difficulty: "medium",
      level: "Mid",
      roleTags: ["software-engineer-frontend"],
      baseScore: 0.5,
    };
    const devops: RerankerCandidate = {
      id: "ops",
      question: "How do you tune Kubernetes HPA?",
      answer: "Use custom metrics and cool-downs.",
      category: "DevOps",
      difficulty: "medium",
      level: "Staff",
      roleTags: ["devops-cloud-engineer"],
      baseScore: 0.5,
    };

    const frontendScore = computeHeuristicRerankScore(query, frontend, {
      targetRoleSlug: "software-engineer-frontend",
      preferredCategories: ["Front-end", "Web Development"],
      targetLevel: "mid-level",
    });
    const devopsScore = computeHeuristicRerankScore(query, devops, {
      targetRoleSlug: "software-engineer-frontend",
      preferredCategories: ["Front-end", "Web Development"],
      targetLevel: "mid-level",
    });
    expect(frontendScore).toBeGreaterThan(devopsScore);
  });

  it("penalizes off-topic categories when preferred categories are set", () => {
    const query = "Kafka consumer groups Redis Redlock duplicate payment processing";
    const distributed: RerankerCandidate = {
      id: "dist",
      question: "Why is Redis Redlock used for distributed locking across payment workers?",
      answer: "It coordinates mutex ownership across Kafka consumers and database mutations.",
      category: "Distributed Systems",
      difficulty: "hard",
      level: "Senior",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.55,
    };
    const security: RerankerCandidate = {
      id: "sec",
      question: "What is Red Teaming in a secure network assessment?",
      answer: "Ethical hackers simulate sophisticated cyberattacks.",
      category: "Security",
      difficulty: "hard",
      level: "Senior",
      roleTags: ["security-engineer"],
      baseScore: 0.55,
    };

    const preferred = ["Distributed Systems", "Database and SQL", "System Design"];
    const distScore = computeHeuristicRerankScore(query, distributed, {
      targetRoleSlug: "software-engineer-backend",
      preferredCategories: preferred,
      targetLevel: "senior",
      strictCategoryPreference: true,
    });
    const secScore = computeHeuristicRerankScore(query, security, {
      targetRoleSlug: "software-engineer-backend",
      preferredCategories: preferred,
      targetLevel: "senior",
      strictCategoryPreference: true,
    });
    expect(distScore).toBeGreaterThan(secScore);
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
      level: "Mid",
      roleTags: ["software-engineer-backend"],
      baseScore: 0.4,
    },
    {
      id: "q2",
      question: "How does Kubernetes handle horizontal pod autoscaling based on custom metrics?",
      answer: "HPA queries metric server via custom metrics API and adjusts replica counts.",
      category: "DevOps",
      difficulty: "hard",
      level: "Senior",
      roleTags: ["devops-cloud-engineer"],
      baseScore: 0.6,
    },
  ];

  it("reranks candidates according to the query domain and returns ordered scored list", async () => {
    const query = "Postgres indexing, LSM tree storage engines, and database query optimization.";
    const results = await rerankCandidates(query, candidates, {
      targetRoleSlug: "software-engineer-backend",
      targetDifficulty: "medium",
      preferredCategories: ["Database and SQL"],
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

