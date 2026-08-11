import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPublishedCodingQuestions,
  getPublishedCodingSearchResults,
  toCodingWorkspaceQuestion,
} from "./coding-question-repo";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  unstableCache: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { codingQuestion: { findMany: mocks.findMany } },
}));

vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toCodingWorkspaceQuestion", () => {
  it("shapes public samples without exposing hidden tests or admin solution code", () => {
    const workspace = toCodingWorkspaceQuestion({
      id: "coding-1",
      slug: "sum-pair",
      title: "Sum Pair",
      description: "Print the pair.",
      constraints: null,
      difficulty: "easy",
      topics: ["arrays"],
      estimatedTime: "15 min",
      hint: null,
      starterCode: { javascript: "console.log(input);" },
      solutionCode: { javascript: "console.log('answer');" },
      testCases: [
        { ordinal: 1, input: "1 2", expectedOutput: "3", isHidden: false },
        { ordinal: 2, input: "99 1", expectedOutput: "100", isHidden: true },
      ],
    });

    expect(workspace).toMatchObject({
      slug: "sum-pair",
      sampleTestCases: [{ ordinal: 1, expectedOutput: "3" }],
    });
    expect(workspace).not.toHaveProperty("solutionCode");
    expect(workspace).not.toHaveProperty("testCases");
    expect(workspace).not.toHaveProperty("solved");
  });

  it("returns null when a published record cannot form a valid concept workspace", () => {
    const workspace = toCodingWorkspaceQuestion({
      id: "coding-invalid",
      slug: "invalid-concept",
      title: "Invalid Concept",
      description: "This record has no JavaScript preview source.",
      constraints: null,
      difficulty: "easy",
      topics: ["arrays"],
      estimatedTime: null,
      hint: null,
      starterCode: { javascript: "" },
      testCases: [{ ordinal: 1, input: "1 2", expectedOutput: "3", isHidden: false }],
    });

    expect(workspace).toBeNull();
  });

  it("renumbers visible samples after filtering retained hidden cases", () => {
    const workspace = toCodingWorkspaceQuestion({
      id: "coding-ordinal-gap",
      slug: "ordinal-gap",
      title: "Ordinal Gap",
      description: "Show the public sample.",
      constraints: null,
      difficulty: "easy",
      topics: ["arrays"],
      estimatedTime: null,
      hint: null,
      starterCode: { javascript: "function preview() {}" },
      testCases: [
        { ordinal: 1, input: "hidden", expectedOutput: "hidden", isHidden: true },
        { ordinal: 2, input: "public", expectedOutput: "shown", isHidden: false },
      ],
    });

    expect(workspace?.sampleTestCases).toEqual([
      { ordinal: 1, input: "public", expectedOutput: "shown" },
    ]);
  });
});

describe("getPublishedCodingQuestions", () => {
  it("excludes malformed concepts while preserving valid catalog order", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "coding-valid-1",
        slug: "valid-first",
        title: "Valid First",
        description: "A valid concept.",
        constraints: null,
        difficulty: "easy",
        topics: ["arrays"],
        estimatedTime: "10 min",
        hint: null,
        starterCode: { javascript: "function preview() {}" },
        testCases: [{ ordinal: 1, input: "1", expectedOutput: "1", isHidden: false }],
      },
      {
        id: "coding-invalid",
        slug: "invalid-preview",
        title: "Invalid Preview",
        description: "This concept has an invalid preview.",
        constraints: null,
        difficulty: "easy",
        topics: ["arrays"],
        estimatedTime: null,
        hint: null,
        starterCode: { javascript: "" },
        testCases: [{ ordinal: 1, input: "1", expectedOutput: "1", isHidden: false }],
      },
      {
        id: "coding-valid-2",
        slug: "valid-second",
        title: "Valid Second",
        description: "Another valid concept.",
        constraints: null,
        difficulty: "medium",
        topics: ["strings"],
        estimatedTime: "20 min",
        hint: "Start small.",
        starterCode: { javascript: "function preview() { return true; }" },
        testCases: [{ ordinal: 1, input: "ok", expectedOutput: "true", isHidden: false }],
      },
    ]);

    const questions = await getPublishedCodingQuestions();

    expect(questions.map((question) => question.slug)).toEqual(["valid-first", "valid-second"]);
  });

  it("uses a shared, tag-invalidatable catalog cache", async () => {
    mocks.findMany.mockResolvedValue([]);

    await getPublishedCodingQuestions();

    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["coding-catalog-v1"],
      {
        revalidate: 300,
        tags: ["coding-catalog-v1"],
      },
    );
  });
});

describe("getPublishedCodingSearchResults", () => {
  it("searches validated cached concepts by their full description", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "coding-cache-search",
        slug: "rate-limit-window",
        title: "Rate limit window",
        description: "Implement a sliding window request limiter.",
        constraints: null,
        difficulty: "medium",
        topics: ["queues"],
        estimatedTime: "20 min",
        hint: null,
        starterCode: { javascript: "function allowRequest() {}" },
        testCases: [{ ordinal: 1, input: "1", expectedOutput: "true", isHidden: false }],
      },
    ]);

    const matches = await getPublishedCodingSearchResults("sliding window");

    expect(matches).toEqual([expect.objectContaining({ slug: "rate-limit-window" })]);
    expect(mocks.unstableCache).toHaveBeenCalledTimes(1);
  });
});
