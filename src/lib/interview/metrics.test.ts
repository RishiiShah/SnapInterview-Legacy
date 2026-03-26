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
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
        videoKey: "user-1/interview-session-1.webm",
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
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ]);
    vi.mocked(prisma.transcriptEntry.findMany).mockResolvedValue([]);

    const dashboard = await getDashboardOverviewData("user-1");
    const avgStat = dashboard.stats.find((item) => item.label === "Average Score");

    expect(avgStat?.value).toBe("92");
    expect(dashboard.recentSessions[0]?.score).toBe(92);
    expect(dashboard.chartData.some((point) => point.value === 92)).toBe(true);

    const analytics = await getAnalyticsOverviewData("user-1");

    expect(analytics.monthlyComparison[0]?.avgScore).toBe(92);
    expect(analytics.weeklyScores.some((point) => point.value === 92)).toBe(true);
    expect(analytics.categoryBreakdown[0]?.score).toBe(92);
  });

  it("prefers persisted evaluation strengths and improvements over transcript keyword fallbacks", async () => {
    const now = new Date();

    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      {
        id: "session-1",
        role: "Frontend Engineer",
        company: "Acme",
        videoKey: "user-1/interview-session-1.webm",
        type: "behavioral",
        status: "COMPLETED",
        questionCount: 5,
        currentQuestion: 5,
        evaluation: {
          score: 90,
          feedback: "Strong interview.",
          strengths: ["Structured storytelling", "Impact orientation"],
          areasForImprovement: ["Stronger quantification", "Technical depth"],
        },
        createdAt: now,
      },
      {
        id: "session-2",
        role: "Frontend Engineer",
        company: "Acme",
        videoKey: "user-1/interview-session-2.webm",
        type: "behavioral",
        status: "COMPLETED",
        questionCount: 5,
        currentQuestion: 5,
        evaluation: {
          score: 87,
          feedback: "Good interview.",
          strengths: ["Structured storytelling"],
          areasForImprovement: ["Technical depth"],
        },
        createdAt: now,
      },
    ] as never);
    vi.mocked(prisma.transcriptEntry.findMany).mockResolvedValue([
      {
        question: "Tell me about leadership",
        answer: "Um, maybe I led the project.",
        createdAt: now,
      },
    ] as never);

    const analytics = await getAnalyticsOverviewData("user-1");

    expect(analytics.strengths[0]).toBe("Structured storytelling");
    expect(analytics.improvements[0]).toBe("Technical depth");
  });

  it("returns empty strengths and improvements for users with no history", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transcriptEntry.findMany).mockResolvedValue([]);

    const analytics = await getAnalyticsOverviewData("user-no-history");

    expect(analytics.strengths).toEqual([]);
    expect(analytics.improvements).toEqual([]);
  });
});
