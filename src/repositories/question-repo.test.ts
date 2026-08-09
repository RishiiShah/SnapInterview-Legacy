import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllPracticeQuestions,
  getPracticeQuestionById,
  getPracticeQuestionBySlug,
} from "./question-repo";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  unstableCache: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { practiceQuestion: mocks },
}));

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
}));

const validQuestion = {
  id: 700,
  slug: "valid-question",
  text: "Describe a technical tradeoff.",
  category: "technical",
  difficulty: "medium",
  estimatedTime: null,
  tags: [],
  hint: null,
  sampleAnswer: null,
};

const invalidQuestion = { ...validQuestion, id: 701, slug: "legacy-coding", category: "coding" };

describe("practice question candidate repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes legacy rows outside the Q&A category vocabulary from the candidate list", async () => {
    mocks.findMany.mockResolvedValue([validQuestion, invalidQuestion]);

    await expect(getAllPracticeQuestions()).resolves.toEqual([
      expect.objectContaining({ id: 700, category: "technical" }),
    ]);
  });

  it("uses a shared, tag-invalidatable practice-question catalog cache", async () => {
    mocks.findMany.mockResolvedValue([]);

    await getAllPracticeQuestions();

    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["practice-question-catalog-v1"],
      {
        revalidate: 300,
        tags: ["practice-question-catalog-v1"],
      },
    );
  });

  it("does not return an invalid legacy slug row as a candidate question", async () => {
    mocks.findUnique.mockResolvedValue(invalidQuestion);

    await expect(getPracticeQuestionBySlug("legacy-coding")).resolves.toBeUndefined();
  });

  it("does not return an invalid legacy id row as a candidate question", async () => {
    mocks.findUnique.mockResolvedValue(invalidQuestion);

    await expect(getPracticeQuestionById(701)).resolves.toBeUndefined();
  });
});
