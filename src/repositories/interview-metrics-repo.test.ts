import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: { findMany: vi.fn() },
    transcriptEntry: { findMany: vi.fn() },
    questionFeedback: { groupBy: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  groupQuestionFeedbackForUser,
  listMetricSessionsForUser,
  listMetricTranscriptsForUser,
  listRecentRecordedMetricSessionsForUser,
} from "./interview-metrics-repo";

describe("interview metrics repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.transcriptEntry.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.questionFeedback.groupBy).mockResolvedValue([] as never);
  });

  it.each([
    { params: { userId: "user-1" }, expectedWhere: { userId: "user-1", deletedAt: null } },
    {
      params: { userId: "user-1", status: "COMPLETED" as const },
      expectedWhere: { userId: "user-1", deletedAt: null, status: "COMPLETED" },
    },
  ])("lists bounded metric sessions with stable descending order: $params", async ({ params, expectedWhere }) => {
    await listMetricSessionsForUser(params);

    const query = vi.mocked(prisma.interviewSession.findMany).mock.calls[0]?.[0];
    expect(query).toEqual(expect.objectContaining({
      where: expectedWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: expect.objectContaining({
        id: true,
        difficulty: true,
        durationMinutes: true,
        evaluation: true,
        createdAt: true,
      }),
    }));
    expect(query?.take).toBe(200);
  });

  it("bounds transcript fallback by the supplied limit", async () => {
    await listMetricTranscriptsForUser({ userId: "user-1", limit: 500 });

    expect(prisma.transcriptEntry.findMany).toHaveBeenCalledWith({
      where: { interviewSession: { userId: "user-1", deletedAt: null } },
      select: { question: true, answer: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
    });
  });

  it("keeps recent recorded-session work bounded", async () => {
    await listRecentRecordedMetricSessionsForUser({ userId: "user-1", limit: 5 });

    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "user-1",
        deletedAt: null,
        videoKey: { not: null },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 15,
    }));
  });

  it("maps grouped feedback counts to the repository contract", async () => {
    vi.mocked(prisma.questionFeedback.groupBy).mockResolvedValue([
      { rating: "up", _count: { _all: 4 } },
      { rating: "down", _count: { _all: 2 } },
    ] as never);

    await expect(groupQuestionFeedbackForUser("user-1")).resolves.toEqual([
      { rating: "up", count: 4 },
      { rating: "down", count: 2 },
    ]);
    expect(prisma.questionFeedback.groupBy).toHaveBeenCalledWith({
      by: ["rating"],
      where: { interviewSession: { userId: "user-1", deletedAt: null } },
      _count: { _all: true },
    });
  });
});
