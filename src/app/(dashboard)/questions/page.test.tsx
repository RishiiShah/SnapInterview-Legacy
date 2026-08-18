import { beforeEach, describe, expect, it, vi } from "vitest";
import { deferred } from "@/test-utils/deferred";

const mocks = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  getAllPracticeQuestions: vi.fn(),
  solvedQuestionFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: mocks.getServerAuthSession,
}));

vi.mock("@/repositories/question-repo", () => ({
  getAllPracticeQuestions: mocks.getAllPracticeQuestions,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    solvedQuestion: { findMany: mocks.solvedQuestionFindMany },
    user: { findUnique: mocks.userFindUnique },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/questions/QuestionsPageClient", () => ({
  default: () => null,
}));

import QuestionsPage from "./page";

describe("QuestionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerAuthSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("loads solved IDs directly in parallel with the question catalog", async () => {
    const solved = deferred<Array<{ questionId: number }>>();
    const catalog = deferred<Array<{ id: number; slug: string }>>();
    mocks.solvedQuestionFindMany.mockReturnValue(solved.promise);
    mocks.getAllPracticeQuestions.mockReturnValue(catalog.promise);

    const page = QuestionsPage();

    await vi.waitFor(() => {
      expect(mocks.solvedQuestionFindMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { questionId: true },
      });
      expect(mocks.getAllPracticeQuestions).toHaveBeenCalledOnce();
    });

    solved.resolve([{ questionId: 7 }]);
    catalog.resolve([{ id: 7, slug: "technical-tradeoff" }]);
    await page;

    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });
});
