import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  transaction: vi.fn(),
  outerExecuteRaw: vi.fn(),
  outerFindUnique: vi.fn(),
  outerCreate: vi.fn(),
  txExecuteRaw: vi.fn(),
  txFindUnique: vi.fn(),
  txCreate: vi.fn(),
  txUpdate: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession: mocks.requireAdminSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    $executeRaw: mocks.outerExecuteRaw,
    practiceQuestion: {
      findUnique: mocks.outerFindUnique,
      create: mocks.outerCreate,
    },
  },
}));

import { createPracticeQuestionAction, importPracticeQuestionsAction } from "./actions";

function questionForm(values: Record<string, string> = {}) {
  const formData = new FormData();
  const defaults = {
    slug: "atomic-question",
    text: "Describe a difficult technical decision.",
    category: "technical",
    difficulty: "medium",
    estimatedTime: "5 min",
    tags: "architecture",
  };

  for (const [key, value] of Object.entries({ ...defaults, ...values })) {
    formData.set(key, value);
  }

  return formData;
}

describe("createPracticeQuestionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => undefined);
    mocks.requireAdminSession.mockResolvedValue({ user: { email: "admin@example.com" } });
    mocks.outerCreate.mockResolvedValue({ id: 1 });
  });

  it("writes directly and relies on the unique slug constraint", async () => {
    await createPracticeQuestionAction(questionForm());

    expect(mocks.outerFindUnique).not.toHaveBeenCalled();
    expect(mocks.outerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "atomic-question" }),
    });
  });

  it("reports a concurrent slug conflict without repairing the ID sequence", async () => {
    mocks.outerCreate.mockRejectedValueOnce({
      code: "P2002",
      meta: { target: ["slug"] },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("redirected");
    });

    await expect(createPracticeQuestionAction(questionForm())).rejects.toThrow("redirected");

    expect(mocks.outerExecuteRaw).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/questions/new?error=A%20question%20with%20this%20slug%20already%20exists.",
    );
  });
});

describe("importPracticeQuestionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => undefined);
    mocks.requireAdminSession.mockResolvedValue({ user: { email: "admin@example.com" } });
    mocks.outerFindUnique.mockResolvedValue(null);
    mocks.outerCreate.mockResolvedValue({ id: 1 });
    mocks.txFindUnique.mockResolvedValue(null);
    mocks.txCreate.mockResolvedValue({ id: 1 });
    mocks.transaction.mockImplementation(async (callback) => callback({
      $executeRaw: mocks.txExecuteRaw,
      practiceQuestion: {
        findUnique: mocks.txFindUnique,
        create: mocks.txCreate,
        update: mocks.txUpdate,
      },
    }));
  });

  it("writes a valid import through one transaction", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [JSON.stringify([{
          slug: "transactional-question",
          text: "Describe a difficult technical decision.",
          category: "technical",
          difficulty: "medium",
          tags: ["architecture"],
        }])],
        "questions.json",
        { type: "application/json" },
      ),
    );

    await importPracticeQuestionsAction(formData);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "transactional-question" }),
    });
    expect(mocks.outerCreate).not.toHaveBeenCalled();
  });

  it("imports quoted multiline CSV through one transaction", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [[
          "slug,text,category,difficulty,tags,sampleAnswer",
          'csv-question,"Explain queues, stacks, and tradeoffs",technical,medium,"queue,stack","line one',
          'line two"',
        ].join("\n")],
        "questions.csv",
        { type: "text/csv" },
      ),
    );

    await importPracticeQuestionsAction(formData);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "csv-question",
        sampleAnswer: "line one\nline two",
      }),
    });
  });
});
