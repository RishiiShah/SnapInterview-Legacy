import { beforeEach, describe, expect, it, vi } from "vitest";
import { deferred } from "@/test-utils/deferred";

const mocks = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  getPracticeQuestionRuntimeDataBySlug: vi.fn(),
  solvedQuestionFindUnique: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: mocks.getServerAuthSession,
}));

vi.mock("@/repositories/question-repo", () => ({
  getPracticeQuestionRuntimeDataBySlug: mocks.getPracticeQuestionRuntimeDataBySlug,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    solvedQuestion: { findUnique: mocks.solvedQuestionFindUnique },
  },
}));

vi.mock("@/components/questions/QuestionDetailPageClient", () => ({
  default: () => null,
}));

import QuestionDetailPage from "./page";

describe("QuestionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.solvedQuestionFindUnique.mockResolvedValue(null);
  });

  it("starts authentication and question lookup together", async () => {
    const session = deferred<{ user: { id: string } }>();
    const runtimeData = deferred<{
      question: { id: number; slug: string };
      allQuestions: Array<{ id: number; slug: string }>;
      currentIndex: number;
    }>();
    mocks.getServerAuthSession.mockReturnValue(session.promise);
    mocks.getPracticeQuestionRuntimeDataBySlug.mockReturnValue(runtimeData.promise);

    const page = QuestionDetailPage({
      params: Promise.resolve({ slug: "technical-tradeoff" }),
    });

    await vi.waitFor(() => {
      expect(mocks.getServerAuthSession).toHaveBeenCalledOnce();
      expect(mocks.getPracticeQuestionRuntimeDataBySlug).toHaveBeenCalledWith(
        "technical-tradeoff",
      );
    });

    session.resolve({ user: { id: "user-1" } });
    runtimeData.resolve({
      question: { id: 7, slug: "technical-tradeoff" },
      allQuestions: [{ id: 7, slug: "technical-tradeoff" }],
      currentIndex: 0,
    });

    await page;
  });
});
