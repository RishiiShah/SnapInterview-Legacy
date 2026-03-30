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

describe("deriveSubScores (via getAnalyticsOverviewData)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.transcriptEntry.findMany).mockResolvedValue([]);
  });

  function makeSession(overrides: object) {
    return {
      id: "s",
      role: "Engineer",
      company: "Acme",
      videoKey: null,
      type: "behavioral",
      status: "COMPLETED",
      questionCount: 5,
      currentQuestion: 5,
      evaluation: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  it("averages sub-scores across all sessions that have evaluations", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      makeSession({
        id: "s1",
        evaluation: {
          score: 80,
          feedback: "Good.",
          strengths: ["Clarity"],
          areasForImprovement: ["Depth"],
          communication: 70,
          technicalDepth: 60,
          clarity: 90,
        },
      }),
      makeSession({
        id: "s2",
        evaluation: {
          score: 90,
          feedback: "Great.",
          strengths: ["Clarity"],
          areasForImprovement: ["Depth"],
          communication: 90,
          technicalDepth: 80,
          clarity: 70,
        },
      }),
    ] as never);

    const analytics = await getAnalyticsOverviewData("user-sub");

    expect(analytics.subScores.communication).toBe(80); // (70 + 90) / 2
    expect(analytics.subScores.technicalDepth).toBe(70); // (60 + 80) / 2
    expect(analytics.subScores.clarity).toBe(80); // (90 + 70) / 2
  });

  it("returns null for each sub-score when no sessions have evaluations", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      makeSession({ id: "s1", evaluation: null }),
      makeSession({ id: "s2", evaluation: null }),
    ] as never);

    const analytics = await getAnalyticsOverviewData("user-no-evals");

    expect(analytics.subScores.communication).toBeNull();
    expect(analytics.subScores.technicalDepth).toBeNull();
    expect(analytics.subScores.clarity).toBeNull();
  });

  it("returns null for sub-scores omitted from some evaluations (backward compat)", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      makeSession({
        id: "s1",
        evaluation: {
          score: 85,
          feedback: "Ok.",
          strengths: [],
          areasForImprovement: [],
          // no sub-score fields
        },
      }),
    ] as never);

    const analytics = await getAnalyticsOverviewData("user-old-eval");

    expect(analytics.subScores.communication).toBeNull();
    expect(analytics.subScores.technicalDepth).toBeNull();
    expect(analytics.subScores.clarity).toBeNull();
  });

  it("includes only sessions that have the sub-score when mixing old and new evaluations", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      makeSession({
        id: "s1",
        evaluation: {
          score: 80,
          feedback: "Good.",
          strengths: ["Clarity"],
          areasForImprovement: ["Depth"],
          communication: 60,
          // technicalDepth and clarity absent
        },
      }),
      makeSession({
        id: "s2",
        evaluation: {
          score: 90,
          feedback: "Great.",
          strengths: ["Clarity"],
          areasForImprovement: ["Depth"],
          communication: 80,
          technicalDepth: 70,
          clarity: 90,
        },
      }),
    ] as never);

    const analytics = await getAnalyticsOverviewData("user-mixed");

    expect(analytics.subScores.communication).toBe(70); // (60 + 80) / 2
    expect(analytics.subScores.technicalDepth).toBe(70); // only s2
    expect(analytics.subScores.clarity).toBe(90); // only s2
  });

  it("returns null sub-scores when there are no completed sessions at all", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([] as never);

    const analytics = await getAnalyticsOverviewData("user-empty");

    expect(analytics.subScores.communication).toBeNull();
    expect(analytics.subScores.technicalDepth).toBeNull();
    expect(analytics.subScores.clarity).toBeNull();
  });
});
