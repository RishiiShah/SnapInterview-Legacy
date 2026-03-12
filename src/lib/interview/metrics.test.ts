import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnalyticsOverviewData, getDashboardOverviewData } from "./metrics";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    interviewSession: {
      findMany: vi.fn(),
    },
    transcriptEntry: {
      findMany: vi.fn(),
    },
  },
}));

describe("interview metrics scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers persisted model evaluation score over derived completion score", async () => {
    const now = new Date();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: null,
      email: "user@example.com",
      emailVerified: null,
      image: null,
      passwordHash: null,
      isFirstLogin: false,
      notificationPrefs: {},
      createdAt: now,
      updatedAt: now,
    } as any);
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      {
        id: "session-1",
        userId: "user-1",
        role: "Frontend Engineer",
        company: "Acme",
        type: "behavioral",
        difficulty: "medium",
        jobDescription: null,
        resumeUrl: null,
        videoUrl: null,
        status: "COMPLETED",
        questionCount: 5,
        currentQuestion: 1,
        evaluation: {
          score: 92,
          feedback: "Strong interview",
          strengths: ["Structured answers"],
          areasForImprovement: ["Add more metrics"],
        },
        createdAt: now,
      } as any,
    ]);
    vi.mocked(prisma.transcriptEntry.findMany).mockResolvedValue([]);

    const dashboard = await getDashboardOverviewData("user@example.com");
    const avgStat = dashboard.stats.find((item) => item.label === "Average Score");

    expect(avgStat?.value).toBe("92");
    expect(dashboard.recentSessions[0]?.score).toBe(92);
    expect(dashboard.chartData.some((point) => point.value === 92)).toBe(true);

    const analytics = await getAnalyticsOverviewData("user@example.com");

    expect(analytics.monthlyComparison[0]?.avgScore).toBe(92);
    expect(analytics.weeklyScores.some((point) => point.value === 92)).toBe(true);
    expect(analytics.categoryBreakdown[0]?.score).toBe(92);
  });
});
