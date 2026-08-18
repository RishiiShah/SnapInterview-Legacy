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
    mocks.embed.mockResolvedValue([Array.from({ length: 384 }, () => 0)]);
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
    mocks.queryRaw.mockResolvedValueOnce([
      corpusRow("corpus-1", {
        question: "Explain the Virtual DOM and reconciliation in React.",
        answer: "Virtual DOM is a lightweight JavaScript representation of DOM.",
        types: ["domain-role", "coding-algorithms"],
        similarity: 0.85,
      }),
    ]);

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

  it("does not record or trace results after the outer timeout wins", async () => {
    vi.useFakeTimers();
    const embedding = deferred<number[][]>();
    mocks.embed.mockReturnValueOnce(embedding.promise);
    mocks.ragTracePath.mockReturnValue("rag-trace.jsonl");
    mocks.queryRaw.mockResolvedValue([corpusRow("late-corpus-1")]);

    const retrieval = retrieveQuestionsForSession(session);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.embed).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(2_501);
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

    await vi.advanceTimersByTimeAsync(2_501);
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
});
