import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  queryRaw: vi.fn(),
  embed: vi.fn(),
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

import {
  formatRetrievedQuestions,
  isQuestionRetrievalEnabled,
  retrieveQuestionsForSession,
} from "./retrieve";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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

describe("retrieveQuestionsForSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAG_RETRIEVAL_ENABLED", "true");
    mocks.embed.mockResolvedValue([Array.from({ length: 384 }, () => 0)]);
    mocks.findMany.mockResolvedValue([]);
    mocks.queryRaw.mockResolvedValue([]);
    mocks.createMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
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
      {
        id: "corpus-1",
        question: "Explain the Virtual DOM and reconciliation in React.",
        answer: "Virtual DOM is a lightweight JavaScript representation of DOM.",
        category: "Front-end",
        difficulty: "medium",
        roleTags: ["frontend-developer"],
        types: ["domain-role", "coding-algorithms"],
        similarity: 0.85,
        embedding: "[0.1, 0.2]",
      },
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

  it("returns empty list when feature flag is disabled", async () => {
    vi.stubEnv("RAG_RETRIEVAL_ENABLED", "false");
    expect(isQuestionRetrievalEnabled()).toBe(false);

    const results = await retrieveQuestionsForSession(session);
    expect(results).toEqual([]);
    expect(mocks.embed).not.toHaveBeenCalled();
  });
});
