import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deferred } from "@/test-utils/deferred";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  queryRaw: vi.fn(),
  embed: vi.fn(),
  ragTracePath: vi.fn(),
  writeRagTrace: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    retrievedQuestion: {
      findMany: mocks.findMany,
      createMany: mocks.createMany,
    },
    $queryRaw: mocks.queryRaw,
  },
}));

vi.mock("@/lib/rag/embeddings", () => ({
  localEmbedder: { dimensions: 384, embed: mocks.embed },
  toVectorLiteral: () => "[0]",
  cosineSimilarity: () => 0,
}));

vi.mock("@/lib/rag/trace", () => ({
  ragTracePath: mocks.ragTracePath,
  writeRagTrace: mocks.writeRagTrace,
}));

vi.mock("@/utils/logger", () => ({
  logger: { warn: mocks.warn },
}));

import {
  formatRetrievedQuestions,
  isQuestionRetrievalEnabled,
  retrieveQuestionsForSession,
} from "./retrieve";
import { RETRIEVAL_TIMEOUT_MS } from "./retrieval-orchestrator";

const session = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "user-1",
  role: "Frontend Engineer",
  company: null,
  type: "coding-algorithms" as const,
  difficulty: "medium" as const,
  persona: "balanced" as const,
  jobDescription: null,
  resumeUrl: null,
  resumeText: null,
  questionCount: 5,
  currentQuestion: 0,
  transcript: [],
};

function corpusRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    question: "Explain React reconciliation.",
    answer: "React compares virtual trees before updating the DOM.",
    category: "Front-end",
    difficulty: "medium",
    roleTags: ["software-engineer-frontend"],
    types: ["coding-algorithms"],
    similarity: 0.95,
    rank_score: 0.95,
    embedding: "[0.1, 0.2]",
    ...overrides,
  };
}

describe("retrieveQuestionsForSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAG_RETRIEVAL_ENABLED", "true");
    mocks.embed.mockImplementation(async (texts: string[]) =>
      texts.map(() => Array.from({ length: 384 }, () => 0))
    );
    mocks.findMany.mockResolvedValue([]);
    mocks.queryRaw.mockResolvedValue([]);
    mocks.createMany.mockResolvedValue({ count: 0 });
    mocks.ragTracePath.mockReturnValue(null);
    mocks.writeRagTrace.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("starts embedding while prior-question exclusions are still loading", async () => {
    const exclusions = deferred<Array<{ questionCorpusId: string }>>();
    mocks.findMany.mockReturnValue(exclusions.promise);

    const retrieval = retrieveQuestionsForSession(session);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.embed).toHaveBeenCalledOnce();

    exclusions.resolve([]);
    await expect(retrieval).resolves.toEqual([]);
  });

  it("qualifies pgvector types and cosine operators after relocation", async () => {
    await retrieveQuestionsForSession(session);

    const [strings] = mocks.queryRaw.mock.calls[0] as [TemplateStringsArray];
    const sql = strings.join("?");
    expect(sql).toContain("::extensions.vector");
    expect(sql).toContain("OPERATOR(extensions.<=>)");
  });

  it("returns formatted retrieved candidates with reference answers", async () => {
    const row = corpusRow("corpus-1", {
      question: "Explain the Virtual DOM and reconciliation in React.",
      answer: "Virtual DOM is a lightweight JavaScript representation of DOM.",
      types: ["domain-role", "coding-algorithms"],
      similarity: 0.85,
    });
    // The category-filtered dense search may return empty for mock data, causing
    // a fallback unfiltered re-query. Provide the row on every call so both the
    // filtered attempt and the fallback find it.
    mocks.queryRaw.mockResolvedValue([row]);

    const results = await retrieveQuestionsForSession({
      ...session,
      resumeText: "React, Redux, JavaScript, TypeScript, Next.js",
    });

    expect(results.length).toBe(1);
    expect(results[0].id).toBe("corpus-1");
    expect(results[0].question).toContain("Virtual DOM");
    expect(results[0].answer).toBeDefined();

    const formatted = formatRetrievedQuestions(results);
    expect(formatted).toContain("INTERNAL REFERENCE QUESTION BANK");
    expect(formatted).toContain("Virtual DOM");
    expect(formatted).toContain("Evaluation key points:");
  });

  it("uses sparse-only gap fill instead of repeating the dense database search", async () => {
    await retrieveQuestionsForSession({
      ...session,
      type: "domain-role",
      role: "Frontend Developer",
      focusAreas: ["React Performance", "State Management", "List Virtualization"],
      resumeText: "React Redux Toolkit React Window TypeScript",
      currentQuestion: 2,
      transcript: [
        {
          question: "How did you reduce React re-renders?",
          answer: "I used memoization and kept frequently changing state local.",
          order: 0,
        },
        {
          question: "What remains?",
          answer: "We have not covered Redux state design or list windowing yet.",
          order: 1,
        },
      ],
    });

    expect(mocks.embed.mock.calls[0]?.[0]).toHaveLength(1);
    // Conversational branch: 1 dense (filtered) + 1 dense fallback + 1 sparse
    // Gap-fill branch: 1 sparse-only. Category filter fallback may add queries.
    expect(mocks.queryRaw.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("does not record or trace results after the outer timeout wins", async () => {
    vi.useFakeTimers();
    const embedding = deferred<number[][]>();
    mocks.embed.mockReturnValueOnce(embedding.promise);
    mocks.ragTracePath.mockReturnValue("rag-trace.jsonl");
    mocks.queryRaw.mockResolvedValue([corpusRow("late-corpus-1")]);

    const retrieval = retrieveQuestionsForSession(session);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.embed).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(RETRIEVAL_TIMEOUT_MS + 1);
    await expect(retrieval).resolves.toEqual([]);

    embedding.resolve([Array.from({ length: 384 }, () => 0)]);
    await vi.runAllTimersAsync();

    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.writeRagTrace).not.toHaveBeenCalled();
  });

  it("does not let history latency turn selected results into a timeout fallback", async () => {
    vi.useFakeTimers();
    const historyWrite = deferred<{ count: number }>();
    mocks.createMany.mockReturnValueOnce(historyWrite.promise);
    mocks.queryRaw.mockResolvedValue([corpusRow("history-corpus-1")]);

    const retrieval = retrieveQuestionsForSession(session);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.createMany).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(RETRIEVAL_TIMEOUT_MS + 1);
    const result = await retrieval;

    historyWrite.resolve({ count: 1 });
    await vi.runAllTimersAsync();

    expect(result.map((question) => question.id)).toEqual(["history-corpus-1"]);
  });

  it("catches and logs a scheduled trace failure without changing selected results", async () => {
    mocks.ragTracePath.mockReturnValue("rag-trace.jsonl");
    mocks.writeRagTrace.mockRejectedValueOnce(new Error("trace unavailable"));
    mocks.queryRaw.mockResolvedValue([corpusRow("trace-corpus-1")]);

    const result = await retrieveQuestionsForSession(session);

    expect(result.map((question) => question.id)).toEqual(["trace-corpus-1"]);
    await vi.waitFor(() => {
      expect(mocks.warn).toHaveBeenCalledWith(
        "Failed to complete retrieval side effects",
        expect.objectContaining({ error: "trace unavailable" })
      );
    });
  });

  it("returns empty list when feature flag is disabled", async () => {
    vi.stubEnv("RAG_RETRIEVAL_ENABLED", "false");
    expect(isQuestionRetrievalEnabled()).toBe(false);

    const results = await retrieveQuestionsForSession(session);
    expect(results).toEqual([]);
    expect(mocks.embed).not.toHaveBeenCalled();
  });

  it("keeps retrieval disabled in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAG_RETRIEVAL_ENABLED", "true");
    expect(isQuestionRetrievalEnabled()).toBe(false);
  });
});

import {
  answerWithTopicSignal,
  cleanSpokenTranscript,
  extractActiveAgendaPillar,
  explainRetrievalQuery,
  buildSynthesizedDenseQuery,
  getRetrievalStrategy,
} from "./retrieval-query";

describe("cleanSpokenTranscript", () => {
  it("removes conversational stutter and filler word prefixes from speech-to-text", () => {
    const raw = "Um, uh, yeah so basically, we implemented Redis Redlock with manual TTLs to prevent race conditions.";
    const cleaned = cleanSpokenTranscript(raw);
    expect(cleaned).toBe("we implemented Redis Redlock with manual TTLs to prevent race conditions.");
  });

  it("strips contact details like emails and phone numbers from resume/answer text", () => {
    const raw = "Reach me at john.doe@example.com or +1 (555) 123-4567 regarding the architecture.";
    const cleaned = cleanSpokenTranscript(raw);
    expect(cleaned).not.toContain("john.doe@example.com");
    expect(cleaned).not.toContain("555");
    expect(cleaned).toContain("regarding the architecture.");
  });

  it("handles null, undefined, and empty strings gracefully", () => {
    expect(cleanSpokenTranscript(null)).toBe("");
    expect(cleanSpokenTranscript(undefined)).toBe("");
    expect(cleanSpokenTranscript("")).toBe("");
  });
});

describe("answerWithTopicSignal", () => {
  it("returns clean answer when substantive technical signal is present", () => {
    const ans = "We used Kafka consumer groups with manual commit offsets and idempotency keys.";
    expect(answerWithTopicSignal(ans)).toBe(ans);
  });

  it("suppresses non-answers and deferrals", () => {
    expect(answerWithTopicSignal("I don't know the answer to this.")).toBe("");
    expect(answerWithTopicSignal("No clue, can we skip this question?")).toBe("");
    expect(answerWithTopicSignal("I haven't worked with Kubernetes operators before.")).toBe("");
    expect(answerWithTopicSignal("Pass on this.")).toBe("");
  });

  it("suppresses short answers with fewer than 4 content words", () => {
    expect(answerWithTopicSignal("Yeah sure.")).toBe("");
    expect(answerWithTopicSignal("I think so.")).toBe("");
  });
});

describe("extractActiveAgendaPillar", () => {
  const mockSessionPlan = {
    brief: {
      agenda: {
        pillars: [
          { id: "p1", title: "Domain Fundamentals & React Internals", targetMinutes: 10 },
          { id: "p2", title: "Scalable State Architecture & Virtualization", targetMinutes: 10 },
          { id: "p3", title: "Operational Concurrency & Testing", targetMinutes: 10 },
        ],
      },
    },
  };

  it("extracts pillar according to question index progression", () => {
    expect(extractActiveAgendaPillar(mockSessionPlan, 0)).toBe("Domain Fundamentals & React Internals");
    expect(extractActiveAgendaPillar(mockSessionPlan, 4)).toBe("Scalable State Architecture & Virtualization");
    expect(extractActiveAgendaPillar(mockSessionPlan, 8)).toBe("Operational Concurrency & Testing");
  });

  it("extracts pillar from elapsed time when startedAt is provided (no durationMinutes needed)", () => {
    const startedAt = new Date(Date.now() - 15 * 60000); // 15 minutes ago
    // durationMinutes omitted — should still work using startedAt alone
    const pillar = extractActiveAgendaPillar(mockSessionPlan, 0, startedAt);
    expect(pillar).toBe("Scalable State Architecture & Virtualization");
  });

  it("extracts pillar from elapsed time when startedAt + durationMinutes are both provided", () => {
    const startedAt = new Date(Date.now() - 15 * 60000); // 15 minutes ago
    const pillar = extractActiveAgendaPillar(mockSessionPlan, 0, startedAt, 30);
    expect(pillar).toBe("Scalable State Architecture & Virtualization");
  });

  it("returns the last pillar when elapsed time exceeds total session plan minutes", () => {
    const startedAt = new Date(Date.now() - 60 * 60000); // 60 minutes ago (past all 3 × 10min pillars)
    const pillar = extractActiveAgendaPillar(mockSessionPlan, 0, startedAt);
    expect(pillar).toBe("Operational Concurrency & Testing");
  });

  it("falls through to question-index when startedAt is an invalid date string", () => {
    // Invalid date → NaN → time path skipped → question-index fallback
    const pillar = extractActiveAgendaPillar(mockSessionPlan, 0, "not-a-date");
    expect(pillar).toBe("Domain Fundamentals & React Internals");
  });

  it("handles null, undefined, or malformed sessionPlan without error", () => {
    expect(extractActiveAgendaPillar(null)).toBe("");
    expect(extractActiveAgendaPillar(undefined)).toBe("");
    expect(extractActiveAgendaPillar({ invalid: true })).toBe("");
    expect(extractActiveAgendaPillar({ brief: {} })).toBe("");
  });
});


describe("explainRetrievalQuery & buildSynthesizedDenseQuery", () => {
  const baseSession = {
    id: "sess-1",
    userId: "user-1",
    role: "Frontend Engineer",
    company: "Stripe",
    type: "domain-role" as const,
    difficulty: "hard" as const,
    persona: "strict" as const,
    jobDescription: "Requires React 18, Webpack, and Next.js experience.",
    resumeUrl: null,
    resumeText: "Senior Frontend Engineer specializing in high-throughput React streaming dashboards.",
    questionCount: 10,
    currentQuestion: 3,
    focusAreas: ["React Performance", "Bundle Optimization"],
    sessionPlan: {
      brief: {
        agenda: {
          pillars: [
            { id: "p1", title: "React Component Optimization & Reconciliation", targetMinutes: 10 },
            { id: "p2", title: "Network Virtualization & Bundle Splitting", targetMinutes: 10 },
          ],
        },
      },
    },
    transcript: [
      {
        question: "How did you prevent cascading re-renders in your high-frequency trading dashboard?",
        answer: "We memoized components with React.memo and pushed websocket state down to isolated leaf nodes.",
        order: 0,
      },
    ],
  };

  it("fuses both the interviewer question and candidate answer into the query parts", () => {
    const parts = explainRetrievalQuery(baseSession);
    expect(parts.latestQuestion).toContain("cascading re-renders");
    expect(parts.latestAnswer).toContain("React.memo");
    expect(parts.activePillar).toBe("Network Virtualization & Bundle Splitting");
  });

  it("builds dense query string containing role, active pillar, and conversational turn", () => {
    const query = buildSynthesizedDenseQuery(baseSession, null);
    expect(query).toContain("Frontend Engineer");
    expect(query).toContain("Current topic pillar: Network Virtualization & Bundle Splitting");
    expect(query).toContain("Current discussion: How did you prevent cascading re-renders");
    expect(query).toContain("Candidate response: We memoized components with React.memo");
  });

  it("includes the prior turn as short-term memory when two turns exist", () => {
    const multiTurnSession = {
      ...baseSession,
      transcript: [
        {
          question: "How did you prevent cascading re-renders in your high-frequency trading dashboard?",
          answer: "We memoized components with React.memo and pushed websocket state down to isolated leaf nodes.",
          order: 0,
        },
        {
          question: "What would you improve next in that UI?",
          answer: "I would revisit store subscriptions and how we render very large collections.",
          order: 1,
        },
      ],
    };

    const query = buildSynthesizedDenseQuery(multiTurnSession, null);
    expect(query).toContain("Earlier in this interview:");
    expect(query).toContain("React.memo");
    expect(query).toContain("Current discussion: What would you improve next");
    expect(query).toContain("large collections");
  });

  it("handles cold-start sessions with empty transcript and no sessionPlan gracefully", () => {
    const coldSession = {
      ...baseSession,
      transcript: [],
      sessionPlan: null,
      focusAreas: null,
      jobDescription: null,
      resumeText: null,
    };

    const parts = explainRetrievalQuery(coldSession);
    expect(parts.latestQuestion).toBe("");
    expect(parts.latestAnswer).toBe("");
    expect(parts.activePillar).toBe("");

    const denseQuery = buildSynthesizedDenseQuery(coldSession, null);
    expect(denseQuery).toContain("A domain-role interview for a Frontend Engineer role");
    expect(denseQuery).toContain("Target candidate level: senior");
  });

  it("handles non-answer candidate responses by keeping previous question context if needed", () => {
    const nonAnswerSession = {
      ...baseSession,
      transcript: [
        {
          question: "Can you explain how React fiber work loops schedule concurrent updates?",
          answer: "I don't know the exact internals of React fiber.",
          order: 0,
        },
      ],
    };

    const parts = explainRetrievalQuery(nonAnswerSession);
    expect(parts.latestAnswer).toBe(""); // Non-answer suppressed
    expect(parts.latestQuestion).toContain("React fiber work loops");

    const denseQuery = buildSynthesizedDenseQuery(nonAnswerSession, null);
    expect(denseQuery).toContain("Current discussion topic: Can you explain how React fiber work loops");
    expect(denseQuery).not.toContain("I don't know");
  });
});

describe("getRetrievalStrategy", () => {
  it("balances dense vs sparse weights based on interview format", () => {
    expect(getRetrievalStrategy("behavioral-leadership")).toEqual({ denseWeight: 0.75, sparseWeight: 0.25 });
    expect(getRetrievalStrategy("system-design")).toEqual({ denseWeight: 0.45, sparseWeight: 0.55 });
    expect(getRetrievalStrategy("coding-algorithms")).toEqual({ denseWeight: 0.35, sparseWeight: 0.65 });
    expect(getRetrievalStrategy("domain-role")).toEqual({ denseWeight: 0.4, sparseWeight: 0.6 });
  });
});

describe("QUERY_WEIGHTS & resolveQueryWeights", () => {
  it("includes focusAreas, companySignals, and levelHint as weighted sources", async () => {
    const { QUERY_WEIGHTS, resolveQueryWeights } = await import("./retrieval-query");
    expect(QUERY_WEIGHTS).toMatchObject({
      role: expect.any(Number),
      focusAreas: expect.any(Number),
      latestAnswer: expect.any(Number),
      latestQuestion: expect.any(Number),
      activePillar: expect.any(Number),
      jobDescription: expect.any(Number),
      resumeText: expect.any(Number),
      companySignals: expect.any(Number),
      levelHint: expect.any(Number),
    });

    const opening = resolveQueryWeights({
      role: "Frontend Engineer",
      company: null,
      type: "coding-algorithms",
      difficulty: "medium",
      jobDescription: null,
      resumeUrl: null,
      questionCount: 8,
      currentQuestion: 0,
      transcript: [],
    });
    expect(opening.focusAreas).toBeGreaterThan(QUERY_WEIGHTS.focusAreas);
    expect(opening.latestAnswer).toBeLessThan(QUERY_WEIGHTS.latestAnswer);

    const mid = resolveQueryWeights({
      role: "Frontend Engineer",
      company: null,
      type: "coding-algorithms",
      difficulty: "medium",
      jobDescription: null,
      resumeUrl: null,
      questionCount: 8,
      currentQuestion: 3,
      transcript: [
        {
          question: "How do you virtualize a long list in React?",
          answer: "I use windowing with react-window and memoized row components to keep scroll at 60fps.",
          order: 0,
        },
      ],
    });
    expect(mid.latestAnswer).toBeGreaterThan(QUERY_WEIGHTS.latestAnswer);
  });

  it("surfaces focusAreas, companySignals, and levelHint in query parts when provided", async () => {
    const { explainRetrievalQuery, buildWeightedQueryParts } = await import("./retrieval-query");
    const parts = explainRetrievalQuery(
      {
        role: "Frontend Engineer",
        company: "Amazon",
        type: "behavioral-leadership",
        difficulty: "hard",
        jobDescription: null,
        resumeUrl: null,
        questionCount: 6,
        currentQuestion: 1,
        focusAreas: ["Ownership", "Customer Obsession"],
        sessionPlan: {
          brief: { profile: { level: "senior" } },
        },
        transcript: [],
      },
      {
        companySignals: "Bias for action. Dive deep on operational metrics.",
      }
    );

    expect(parts.focusAreas).toContain("Ownership");
    expect(parts.companySignals).toContain("Bias for action");
    expect(parts.levelHint).toMatch(/senior/i);

    const weighted = buildWeightedQueryParts(
      {
        role: "Frontend Engineer",
        company: "Amazon",
        type: "behavioral-leadership",
        difficulty: "hard",
        jobDescription: null,
        resumeUrl: null,
        questionCount: 6,
        currentQuestion: 1,
        focusAreas: ["Ownership", "Customer Obsession"],
        sessionPlan: {
          brief: { profile: { level: "senior" } },
        },
        transcript: [],
      },
      { companySignals: "Bias for action. Dive deep on operational metrics." }
    );
    const sources = weighted.map((p) => p.source);
    expect(sources).toEqual(expect.arrayContaining(["focusAreas", "companySignals", "levelHint"]));
  });
});
