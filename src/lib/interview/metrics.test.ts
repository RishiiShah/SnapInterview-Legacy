import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAnalyticsOverviewData,
  getDashboardOverviewData,
  getRecentPracticeSessionsByUserId,
} from "./metrics";
import {
  groupQuestionFeedbackForUser,
  listMetricSessionsForUser,
  listMetricTranscriptsForUser,
  listRecentRecordedMetricSessionsForUser,
} from "@/repositories/interview-metrics-repo";

vi.mock("@/repositories/interview-metrics-repo", () => ({
  groupQuestionFeedbackForUser: vi.fn(),
  listMetricSessionsForUser: vi.fn(),
  listMetricTranscriptsForUser: vi.fn(),
  listRecentRecordedMetricSessionsForUser: vi.fn(),
}));

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

describe("interview metrics scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMetricSessionsForUser).mockResolvedValue([]);
    vi.mocked(listMetricTranscriptsForUser).mockResolvedValue([]);
    vi.mocked(listRecentRecordedMetricSessionsForUser).mockResolvedValue([]);
    vi.mocked(groupQuestionFeedbackForUser).mockResolvedValue([]);
  });

  it("prefers persisted model evaluation score over derived completion score", async () => {
    const now = new Date();

    vi.mocked(listMetricSessionsForUser).mockResolvedValue([
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
      } as any,
    ]);
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

  it("uses rubric scores only on the dashboard — never progress placeholders", async () => {
    const now = new Date();

    vi.mocked(listMetricSessionsForUser).mockResolvedValue([
      {
        id: "scored-zero",
        role: "Backend Developer",
        company: null,
        videoKey: null,
        type: "technical",
        difficulty: "medium",
        status: "COMPLETED",
        questionCount: 5,
        currentQuestion: 5,
        evaluation: {
          score: 0,
          feedback: "Incomplete answers.",
          strengths: [],
          areasForImprovement: ["Depth"],
        },
        createdAt: now,
      },
      {
        id: "in-progress",
        role: "Backend Developer",
        company: null,
        videoKey: null,
        type: "behavioral",
        difficulty: "easy",
        status: "IN_PROGRESS",
        questionCount: 10,
        currentQuestion: 2,
        evaluation: null,
        createdAt: now,
      },
      {
        id: "completed-unscored",
        role: "Backend Developer",
        company: null,
        videoKey: null,
        type: "system-design",
        difficulty: "hard",
        status: "COMPLETED",
        questionCount: 5,
        currentQuestion: 5,
        evaluation: null,
        createdAt: new Date(now.getTime() - 60_000),
      },
    ] as any);

    const dashboard = await getDashboardOverviewData("user-rubric-only");
    const avgStat = dashboard.stats.find((item) => item.label === "Average Score");

    expect(dashboard.recentSessions).toHaveLength(2);
    expect(dashboard.recentSessions[0]?.score).toBe(0);
    expect(dashboard.recentSessions[0]?.type).toBe("coding-algorithms");
    expect(dashboard.recentSessions[0]?.difficulty).toBe("medium");
    expect(dashboard.recentSessions[1]?.score).toBeNull();
    expect(dashboard.recentSessions[1]?.type).toBe("system-design");
    expect(avgStat?.value).toBe("0");
    // No invented mid-progress values (e.g. 16 from 2/10 questions).
    expect(dashboard.chartData.every((point) => point.value === 0 || point.value >= 0)).toBe(true);
    expect(dashboard.chartData.some((point) => point.value > 0 && point.value < 30)).toBe(false);
    expect(dashboard.chartData.filter((point) => point.value === 0)).toHaveLength(1);
    expect(dashboard.byType.find((t) => t.type === "coding-algorithms")?.count).toBe(1);
    expect(dashboard.byType.find((t) => t.type === "coding-algorithms")?.avgScore).toBe(0);
    expect(dashboard.byType.find((t) => t.type === "system-design")?.count).toBe(1);
    expect(dashboard.byType.find((t) => t.type === "system-design")?.avgScore).toBeNull();
    // Unpracticed kinds are omitted — dashboard only surfaces real data.
    expect(dashboard.byType.find((t) => t.type === "behavioral-leadership")).toBeUndefined();
    expect(dashboard.byType).toHaveLength(2);
  });

  it("prefers persisted evaluation strengths and improvements over transcript keyword fallbacks", async () => {
    const now = new Date();

    vi.mocked(listMetricSessionsForUser).mockResolvedValue([
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
    vi.mocked(listMetricTranscriptsForUser).mockResolvedValue([
      {
        question: "Tell me about leadership",
        answer: "Um, maybe I led the project.",
        createdAt: now,
      },
    ] as never);

    const analytics = await getAnalyticsOverviewData("user-1");

    expect(analytics.strengths[0]).toBe("Structured storytelling");
    expect(analytics.improvements[0]).toBe("Technical depth");
    expect(listMetricTranscriptsForUser).not.toHaveBeenCalled();
  });

  it("uses completed-session and grouped-feedback queries for analytics", async () => {
    const now = new Date();
    vi.mocked(listMetricSessionsForUser).mockResolvedValue([
      {
        id: "session-1",
        role: "Frontend Engineer",
        company: "Acme",
        videoKey: null,
        type: "behavioral",
        difficulty: "medium",
        status: "COMPLETED",
        questionCount: 5,
        currentQuestion: 5,
        evaluation: {
          score: 90,
          feedback: "Strong interview.",
          strengths: ["Structured storytelling"],
          areasForImprovement: ["Stronger quantification"],
        },
        createdAt: now,
      },
    ] as never);
    vi.mocked(groupQuestionFeedbackForUser).mockResolvedValue([
      { rating: "up", count: 4 },
      { rating: "down", count: 2 },
    ]);

    const analytics = await getAnalyticsOverviewData("user-1");

    expect(listMetricSessionsForUser).toHaveBeenCalledWith({
      userId: "user-1",
      status: "COMPLETED",
    });
    expect(groupQuestionFeedbackForUser).toHaveBeenCalledWith("user-1");
    expect(analytics.feedbackStats).toEqual({ total: 6, thumbsUp: 4, thumbsDown: 2 });
  });

  it("reports lifetime totals beyond the former 300-session cap", async () => {
    const sessions = Array.from({ length: 301 }, (_, index) => ({
      id: `session-${index}`,
      role: "Software Engineer",
      company: null,
      videoKey: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      status: "COMPLETED" as const,
      durationMinutes: 30,
      questionCount: 5,
      currentQuestion: 5,
      evaluation: {
        score: 80,
        feedback: "Good",
        strengths: [],
        areasForImprovement: [],
      },
      createdAt: new Date(2025, 0, 1 + index),
    }));
    vi.mocked(listMetricSessionsForUser).mockResolvedValue(sessions);

    const analytics = await getAnalyticsOverviewData("user-301");
    const dashboard = await getDashboardOverviewData("user-301");

    expect(analytics.totalSessions).toBe(301);
    expect(dashboard.stats.find((stat) => stat.label === "Interviews Completed")?.value).toBe("301");
    expect(dashboard.stats.find((stat) => stat.label === "Hours Practiced")?.value).toBe("150.5");
    expect(dashboard.recentSessions).toHaveLength(5);
  });

  it("keeps recent practice output at the requested limit", async () => {
    vi.mocked(listRecentRecordedMetricSessionsForUser).mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `session-${index}`,
        role: "Software Engineer",
        company: null,
        videoKey: `video-${index}`,
        type: "coding-algorithms",
        difficulty: "medium",
        status: "COMPLETED" as const,
        durationMinutes: 30,
        questionCount: 5,
        currentQuestion: 5,
        evaluation: null,
        createdAt: new Date(2025, 0, index + 1),
      })),
    );

    const recent = await getRecentPracticeSessionsByUserId("user-recent", 2);

    expect(listRecentRecordedMetricSessionsForUser).toHaveBeenCalledWith({
      userId: "user-recent",
      limit: 2,
    });
    expect(recent).toHaveLength(2);
  });

  it("returns empty strengths and improvements for users with no history", async () => {
    vi.mocked(listMetricSessionsForUser).mockResolvedValue([]);
    vi.mocked(listMetricTranscriptsForUser).mockResolvedValue([]);

    const analytics = await getAnalyticsOverviewData("user-no-history");

    expect(analytics.strengths).toEqual([]);
    expect(analytics.improvements).toEqual([]);
    expect(listMetricTranscriptsForUser).toHaveBeenCalledWith({
      userId: "user-no-history",
      limit: 500,
    });
  });
});

describe("deriveSubScores (via getAnalyticsOverviewData)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMetricSessionsForUser).mockResolvedValue([]);
    vi.mocked(listMetricTranscriptsForUser).mockResolvedValue([]);
    vi.mocked(listRecentRecordedMetricSessionsForUser).mockResolvedValue([]);
    vi.mocked(groupQuestionFeedbackForUser).mockResolvedValue([]);
  });

  it("averages sub-scores across all sessions that have evaluations", async () => {
    vi.mocked(listMetricSessionsForUser).mockResolvedValue([
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

  it.each([
    ["there are no completed sessions", []],
    ["sessions have no evaluations", [makeSession({ id: "s1" }), makeSession({ id: "s2" })]],
    ["legacy evaluations omit sub-scores", [makeSession({
      id: "s1",
      evaluation: { score: 85, feedback: "Ok.", strengths: [], areasForImprovement: [] },
    })]],
  ])("returns null sub-scores when %s", async (_label, sessions) => {
    vi.mocked(listMetricSessionsForUser).mockResolvedValue(sessions as never);

    const analytics = await getAnalyticsOverviewData("user-no-subscores");

    expect(analytics.subScores.communication).toBeNull();
    expect(analytics.subScores.technicalDepth).toBeNull();
    expect(analytics.subScores.clarity).toBeNull();
  });

  it("includes only sessions that have the sub-score when mixing old and new evaluations", async () => {
    vi.mocked(listMetricSessionsForUser).mockResolvedValue([
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
});
