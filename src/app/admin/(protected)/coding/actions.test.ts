import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  redirect: vi.fn(),
  requireAdminSession: vi.fn(),
  codingQuestionFindUnique: vi.fn(),
  codingQuestionFindFirst: vi.fn(),
  codingQuestionCreate: vi.fn(),
  codingQuestionUpdate: vi.fn(),
  codingTestCaseDeleteMany: vi.fn(),
  codingTestCaseAggregate: vi.fn(),
  codingTestCaseCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession: mocks.requireAdminSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    codingQuestion: {
      findUnique: mocks.codingQuestionFindUnique,
      findFirst: mocks.codingQuestionFindFirst,
      create: mocks.codingQuestionCreate,
    },
    $transaction: mocks.transaction,
  },
}));

import { createCodingQuestionAction, updateCodingQuestionAction } from "./actions";

function codingForm(values: Record<string, string> = {}) {
  const formData = new FormData();
  const defaults = {
    title: "Sum Pair",
    description: "Return the matching pair.",
    difficulty: "easy",
    starterCode: JSON.stringify({ javascript: "function sumPair() {}" }),
    testCases: JSON.stringify([
      { input: "1 2", expectedOutput: "3" },
      { input: "4 5", expectedOutput: "9" },
    ]),
    isPublished: "true",
  };
  Object.entries({ ...defaults, ...values }).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("coding admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => undefined);
    mocks.requireAdminSession.mockResolvedValue({ user: { email: "admin@example.com" } });
    mocks.codingQuestionFindUnique.mockResolvedValue(null);
    mocks.codingQuestionFindFirst.mockResolvedValue(null);
    mocks.codingQuestionCreate.mockResolvedValue({});
    mocks.codingQuestionUpdate.mockResolvedValue({});
    mocks.codingTestCaseDeleteMany.mockResolvedValue({ count: 2 });
    mocks.codingTestCaseAggregate.mockResolvedValue({ _max: { ordinal: 2 } });
    mocks.codingTestCaseCreateMany.mockResolvedValue({ count: 2 });
    mocks.transaction.mockImplementation(async (callback) => callback({
      codingQuestion: { update: mocks.codingQuestionUpdate },
      codingTestCase: {
        deleteMany: mocks.codingTestCaseDeleteMany,
        aggregate: mocks.codingTestCaseAggregate,
        createMany: mocks.codingTestCaseCreateMany,
      },
    }));
  });

  it("creates public sample cases without writing solution code", async () => {
    await createCodingQuestionAction(codingForm({ solutionCode: JSON.stringify({ javascript: "return [0, 1];" }) }));

    expect(mocks.codingQuestionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        testCases: {
          create: [
            { input: "1 2", expectedOutput: "3", isHidden: false, ordinal: 1 },
            { input: "4 5", expectedOutput: "9", isHidden: false, ordinal: 2 },
          ],
        },
      }),
    });
    expect(mocks.codingQuestionCreate.mock.calls[0][0].data).not.toHaveProperty("solutionCode");
    expect(mocks.codingQuestionFindUnique).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).toHaveBeenCalledWith("coding-catalog-v1", "max");
  });

  it("reports a concurrent create conflict through the unique slug constraint", async () => {
    mocks.codingQuestionCreate.mockRejectedValueOnce({
      code: "P2002",
      meta: { target: ["slug"] },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("redirected");
    });

    await expect(createCodingQuestionAction(codingForm())).rejects.toThrow("redirected");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/coding/new?error=A%20coding%20problem%20with%20this%20slug%20already%20exists.",
    );
  });

  it("replaces only public samples after retained hidden ordinals without overwriting solution code", async () => {
    const formData = codingForm({ questionId: "coding-1", solutionCode: JSON.stringify({ javascript: "return [0, 1];" }) });
    mocks.codingQuestionFindUnique.mockResolvedValue({ id: "coding-1" });

    await updateCodingQuestionAction(formData);

    expect(mocks.codingQuestionUpdate).toHaveBeenCalledWith({
      where: { id: "coding-1" },
      data: expect.not.objectContaining({ solutionCode: expect.anything() }),
    });
    expect(mocks.codingTestCaseDeleteMany).toHaveBeenCalledWith({
      where: { questionId: "coding-1", isHidden: false },
    });
    expect(mocks.codingTestCaseAggregate).toHaveBeenCalledWith({
      where: { questionId: "coding-1", isHidden: true },
      _max: { ordinal: true },
    });
    expect(mocks.codingTestCaseCreateMany).toHaveBeenCalledWith({
      data: [
        { input: "1 2", expectedOutput: "3", isHidden: false, questionId: "coding-1", ordinal: 3 },
        { input: "4 5", expectedOutput: "9", isHidden: false, questionId: "coding-1", ordinal: 4 },
      ],
    });
  });
});
