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

import { importPracticeQuestionsAction } from "./actions";

describe("importPracticeQuestionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
