import { prisma } from "@/lib/prisma";
import { normalizeTranscriptEvaluation } from "@/lib/interview/evaluation";
import { interviewTypeSchema, type InterviewType } from "@/lib/interview/domain";

import { env } from "@/lib/env";

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  expiresAtMs: number;
  value: T;
};

const dashboardCache = new Map<string, CacheEntry<DashboardOverviewData>>();
const analyticsCache = new Map<string, CacheEntry<AnalyticsOverviewData>>();

export function invalidateInterviewMetricsCache(userId: string) {
  dashboardCache.delete(userId);
  analyticsCache.delete(userId);
}

export function invalidateAllInterviewMetricsCaches() {
  dashboardCache.clear();
  analyticsCache.clear();
}

function isTestEnv() {
  return env.NODE_ENV === "test";
}

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  if (isTestEnv()) return null;

  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
) {
  if (isTestEnv()) return;
  cache.set(key, {
    value,
    expiresAtMs: Date.now() + ttlMs,
  });
}

type SessionRecord = {
  id: string;
  role: string;
  company: string | null;
  videoKey: string | null;
  type: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABORTED";
  questionCount: number;
  currentQuestion: number;
  evaluation: unknown;
  createdAt: Date;
};

type DashboardStat = {
  label: string;
  value: string;
  change: string;
  suffix?: string;
  iconKey: "completed" | "average" | "hours" | "streak";
};

type DashboardRecentSession = {
  id: string;
  role: string;
  company: string;
  score: number;
  duration: string;
  date: string;
  videoKey: string | null;
};

type DashboardChartPoint = {
  label: string;
  value: number;
};

export type PracticeRecentSession = {
  id: string;
  role: string;
  company: string;
  type: InterviewType;
  score: number;
  date: string;
};

type AnalyticsMonthlyComparison = {
  label: string;
  interviews: number;
  avgScore: number;
  hours: number;
};

type AnalyticsCategoryScore = {
  category: string;
  score: number;
};

type TranscriptRecord = {
  question: string;
  answer: string;
  createdAt: Date;
};

export type DashboardOverviewData = {
  stats: DashboardStat[];
  recentSessions: DashboardRecentSession[];
  chartData: DashboardChartPoint[];
};

export type SubScores = {
  communication: number | null;
  technicalDepth: number | null;
  clarity: number | null;
};

export type WeeklySubScoreTrends = {
  communication: DashboardChartPoint[];
  technicalDepth: DashboardChartPoint[];
  clarity: DashboardChartPoint[];
};

export type FeedbackStats = {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
};

export type PeriodComparison = {
  currentSessions: number;
  previousSessions: number;
  currentAvg: number | null;
  previousAvg: number | null;
  scoreDelta: number | null;
  scoreDeltaPct: number | null;
  summary: string;
};

export type AnalyticsOverviewData = {
  weeklyScores: DashboardChartPoint[];
  weeklySubScoreTrends: WeeklySubScoreTrends;
  monthlyComparison: AnalyticsMonthlyComparison[];
  periodComparison: PeriodComparison;
  categoryBreakdown: AnalyticsCategoryScore[];
  strengths: string[];
  improvements: string[];
  subScores: SubScores;
  totalSessions: number;
  feedbackStats: FeedbackStats;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const startOfDay = (date: Date): Date => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addDays = (date: Date, days: number): Date => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const estimateSessionMinutes = (session: SessionRecord): number => {
  const questions = Math.max(1, session.questionCount);
  const answered = clamp(session.currentQuestion, 0, questions);
  const effectiveAnswered = session.status === "COMPLETED" ? questions : Math.max(answered, 1);
  return Math.max(5, Math.round(effectiveAnswered * 2.5));
};

const deriveSessionScore = (session: SessionRecord): number => {
  const questions = Math.max(1, session.questionCount);
  const answered = clamp(session.currentQuestion, 0, questions);
  const completionRatio = answered / questions;

  let score = completionRatio * 80;
  if (session.status === "COMPLETED") score += 20;
  if (session.status === "ABORTED") score -= 10;

  return clamp(Math.round(score), 0, 100);
};

const getEvaluationScore = (evaluation: unknown): number | null => {
  const normalized = normalizeTranscriptEvaluation(evaluation);
  if (!normalized) {
    return null;
  }

  return normalized.score;
};

function deriveStrengthsAndImprovementsFromEvaluations(sessions: SessionRecord[]): {
  strengths: string[];
  improvements: string[];
} | null {
  const strengthCounts = new Map<string, number>();
  const improvementCounts = new Map<string, number>();

  for (const session of sessions) {
    const evaluation = normalizeTranscriptEvaluation(session.evaluation);
    if (!evaluation) {
      continue;
    }

    for (const item of evaluation.strengths) {
      strengthCounts.set(item, (strengthCounts.get(item) ?? 0) + 1);
    }

    for (const item of evaluation.areasForImprovement) {
      improvementCounts.set(item, (improvementCounts.get(item) ?? 0) + 1);
    }
  }

  if (strengthCounts.size === 0 && improvementCounts.size === 0) {
    return null;
  }

  return {
    strengths: rankKeywordEntries(Array.from(strengthCounts.entries()), [
      "Communication clarity",
      "STAR method structure",
      "Leadership examples",
    ]),
    improvements: rankKeywordEntries(Array.from(improvementCounts.entries()), [
      "System scalability",
      "Time complexity analysis",
      "Edge case handling",
    ]),
  };
}

const getSessionScore = (session: SessionRecord): number => {
  const evaluationScore = getEvaluationScore(session.evaluation);
  if (evaluationScore !== null) {
    return evaluationScore;
  }

  return deriveSessionScore(session);
};

const formatSessionDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const getMonthRange = (base: Date) => {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
};

const getPreviousMonthRange = (base: Date) => {
  const start = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const end = new Date(base.getFullYear(), base.getMonth(), 1);
  return { start, end };
};

function calculateStreak(sessions: SessionRecord[], now: Date): number {
  if (sessions.length === 0) return 0;

  const activeDays = new Set(
    sessions.map((session) => startOfDay(session.createdAt).toISOString().slice(0, 10))
  );

  let streak = 0;
  let pointer = startOfDay(now);

  if (!activeDays.has(pointer.toISOString().slice(0, 10))) {
    pointer = addDays(pointer, -1);
  }

  while (activeDays.has(pointer.toISOString().slice(0, 10))) {
    streak += 1;
    pointer = addDays(pointer, -1);
  }

  return streak;
}

async function getUserSessions(userId: string): Promise<SessionRecord[]> {
  return getUserSessionsByUserId(userId);
}

async function getUserSessionsByUserId(userId: string): Promise<SessionRecord[]> {
  if (!userId) return [];

  const sessions = await prisma.interviewSession.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      company: true,
      videoKey: true,
      type: true,
      status: true,
      questionCount: true,
      currentQuestion: true,
      evaluation: true,
      createdAt: true,
    },
    take: 300,
  });

  return sessions;
}

export async function getRecentPracticeSessionsByUserId(
  userId: string,
  limit = 5
): Promise<PracticeRecentSession[]> {
  if (!userId) return [];

  const sessions = await prisma.interviewSession.findMany({
    where: {
      userId,
      deletedAt: null,
      videoKey: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      role: true,
      company: true,
      videoKey: true,
      type: true,
      status: true,
      questionCount: true,
      currentQuestion: true,
      evaluation: true,
      createdAt: true,
    },
    take: Math.max(limit * 3, limit),
  });

  return sessions
    .map((session) => {
      const parsedType = interviewTypeSchema.safeParse(session.type);
      if (!parsedType.success) {
        return null;
      }

      return {
        id: session.id,
        role: session.role,
        company: session.company || "Unknown",
        type: parsedType.data,
        score: getSessionScore(session),
        date: formatSessionDate(session.createdAt),
      } satisfies PracticeRecentSession;
    })
    .filter((session): session is PracticeRecentSession => session !== null)
    .slice(0, limit);
}

async function getUserTranscripts(userId: string): Promise<TranscriptRecord[]> {
  if (!userId) return [];

  const transcripts = await prisma.transcriptEntry.findMany({
    where: {
      interviewSession: {
        userId: userId,
        deletedAt: null,
      },
    },
    select: {
      question: true,
      answer: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return transcripts;
}

function rankKeywordEntries(entries: Array<[string, number]>, fallback: string[] = []): string[] {
  if (entries.length === 0) return fallback;

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

function deriveSubScores(sessions: SessionRecord[]): SubScores {
  const comms: number[] = [];
  const tech: number[] = [];
  const clarity: number[] = [];

  for (const session of sessions) {
    const evaluation = normalizeTranscriptEvaluation(session.evaluation);
    if (!evaluation) continue;
    if (evaluation.communication != null) comms.push(evaluation.communication);
    if (evaluation.technicalDepth != null) tech.push(evaluation.technicalDepth);
    if (evaluation.clarity != null) clarity.push(evaluation.clarity);
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return {
    communication: avg(comms),
    technicalDepth: avg(tech),
    clarity: avg(clarity),
  };
}

function deriveStrengthsAndImprovementsFromTranscripts(transcripts: TranscriptRecord[]): {
  strengths: string[];
  improvements: string[];
} {
  if (transcripts.length === 0) {
    return {
      strengths: [],
      improvements: [],
    };
  }

  const positivePatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "Structured storytelling", pattern: /\b(star|situation|task|action|result)\b/i },
    { label: "Ownership and leadership", pattern: /\b(led|owned|drove|mentored|coordinated)\b/i },
    { label: "Execution quality", pattern: /\b(implemented|delivered|launched|built|shipped)\b/i },
    { label: "Impact orientation", pattern: /\b(impact|improved|increased|reduced|saved|grew)\b/i },
    { label: "Cross-functional communication", pattern: /\b(stakeholder|cross-functional|collaborat|aligned)\b/i },
  ];

  const improvementPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "Stronger quantification", pattern: /\b(about|roughly|kind of|maybe|probably)\b/i },
    { label: "Concise communication", pattern: /\b(um|uh|like)\b/i },
    { label: "Technical depth", pattern: /\b(complexity|trade-?off|latency|scale|throughput)\b/i },
    { label: "Clear decision rationale", pattern: /\b(because|therefore|so that|given that)\b/i },
    { label: "Risk and edge-case handling", pattern: /\b(edge case|failure|fallback|risk|monitoring)\b/i },
  ];

  const positiveCounts = new Map<string, number>();
  const improvementCounts = new Map<string, number>();

  for (const transcript of transcripts) {
    const text = `${transcript.question} ${transcript.answer}`.toLowerCase();

    for (const item of positivePatterns) {
      if (item.pattern.test(text)) {
        positiveCounts.set(item.label, (positiveCounts.get(item.label) ?? 0) + 1);
      }
    }

    for (const item of improvementPatterns) {
      if (item.pattern.test(text)) {
        improvementCounts.set(item.label, (improvementCounts.get(item.label) ?? 0) + 1);
      }
    }
  }

  const strengths = rankKeywordEntries(Array.from(positiveCounts.entries()));
  const improvements = rankKeywordEntries(Array.from(improvementCounts.entries()));

  return { strengths, improvements };
}

export async function getDashboardOverviewData(userId: string): Promise<DashboardOverviewData> {
  const cached = readCache(dashboardCache, userId);
  if (cached) {
    return cached;
  }

  const sessions = await getUserSessions(userId);
  const now = new Date();
  const last7Days = addDays(now, -7);

  const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
  const sessionsThisWeek = completedSessions.filter((session) => session.createdAt >= last7Days).length;

  const averageScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, session) => acc + getSessionScore(session), 0) /
            completedSessions.length
        )
      : 0;

  const thisMonthRange = getMonthRange(now);
  const previousMonthRange = getPreviousMonthRange(now);

  const thisMonthCompleted = completedSessions.filter(
    (session) => session.createdAt >= thisMonthRange.start && session.createdAt < thisMonthRange.end
  );
  const previousMonthCompleted = completedSessions.filter(
    (session) => session.createdAt >= previousMonthRange.start && session.createdAt < previousMonthRange.end
  );

  const thisMonthAverage =
    thisMonthCompleted.length > 0
      ? Math.round(
          thisMonthCompleted.reduce((acc, session) => acc + getSessionScore(session), 0) /
            thisMonthCompleted.length
        )
      : 0;

  const previousMonthAverage =
    previousMonthCompleted.length > 0
      ? Math.round(
          previousMonthCompleted.reduce((acc, session) => acc + getSessionScore(session), 0) /
            previousMonthCompleted.length
        )
      : 0;

  const averageDelta = thisMonthAverage - previousMonthAverage;

  const totalHours =
    completedSessions.reduce((acc, session) => acc + estimateSessionMinutes(session), 0) / 60;
  const hoursThisWeek =
    sessions
      .filter((session) => session.createdAt >= last7Days)
      .reduce((acc, session) => acc + estimateSessionMinutes(session), 0) / 60;

  const streak = calculateStreak(sessions, now);

  const recentSessions = completedSessions
    .slice(0, 5)
    .map((session) => ({
    id: session.id,
    role: session.role,
    company: session.company || "Unknown",
    score: getSessionScore(session),
    duration: `${estimateSessionMinutes(session)} min`,
    date: formatSessionDate(session.createdAt),
    videoKey: session.videoKey ?? null,
  }));

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(startOfDay(now), index - 6);
    const dayKey = day.toISOString().slice(0, 10);
    const daySessions = sessions.filter(
      (session) => startOfDay(session.createdAt).toISOString().slice(0, 10) === dayKey
    );
    const avg =
      daySessions.length > 0
        ? Math.round(daySessions.reduce((acc, session) => acc + getSessionScore(session), 0) / daySessions.length)
        : 0;

    return {
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: avg,
    };
  });

  const result: DashboardOverviewData = {
    stats: [
      {
        label: "Interviews Completed",
        value: String(completedSessions.length),
        change: `+${sessionsThisWeek} this week`,
        iconKey: "completed",
      },
      {
        label: "Average Score",
        value: String(averageScore),
        change: `${averageDelta >= 0 ? "+" : ""}${averageDelta} pts vs last month`,
        suffix: "/100",
        iconKey: "average",
      },
      {
        label: "Hours Practiced",
        value: totalHours.toFixed(1),
        change: `${hoursThisWeek.toFixed(1)}h this week`,
        suffix: "h",
        iconKey: "hours",
      },
      {
        label: "Current Streak",
        value: String(streak),
        change: streak >= 7 ? "Personal best!" : "Keep going!",
        suffix: " days 🔥",
        iconKey: "streak",
      },
    ],
    recentSessions,
    chartData: lastSevenDays,
  };

  writeCache(dashboardCache, userId, result, DASHBOARD_CACHE_TTL_MS);
  return result;
}

const prettifyCategory = (value: string): string => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export async function getAnalyticsOverviewData(userId: string): Promise<AnalyticsOverviewData> {
  const cached = readCache(analyticsCache, userId);
  if (cached) {
    return cached;
  }

  const [allSessions, transcripts, feedbackRows] = await Promise.all([
    getUserSessions(userId),
    getUserTranscripts(userId),
    prisma.questionFeedback.findMany({
      where: { interviewSession: { userId, deletedAt: null } },
      select: { rating: true },
    }),
  ]);
  const sessions = allSessions.filter(s => s.status === "COMPLETED");
  const now = new Date();

  const thisMonthRange = getMonthRange(now);
  const previousMonthRange = getPreviousMonthRange(now);

  const thisMonthSessions = sessions.filter(
    (session) => session.createdAt >= thisMonthRange.start && session.createdAt < thisMonthRange.end
  );
  const previousMonthSessions = sessions.filter(
    (session) => session.createdAt >= previousMonthRange.start && session.createdAt < previousMonthRange.end
  );

  const summarizeMonth = (items: SessionRecord[]) => {
    const interviews = items.length;
    const avgScore = interviews > 0
      ? Math.round(items.reduce((acc, session) => acc + getSessionScore(session), 0) / interviews)
      : 0;
    const hours = items.reduce((acc, session) => acc + estimateSessionMinutes(session), 0) / 60;
    return { interviews, avgScore, hours: Number(hours.toFixed(1)) };
  };

  const thisMonth = summarizeMonth(thisMonthSessions);
  const previousMonth = summarizeMonth(previousMonthSessions);

  const weeklyScores = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(startOfDay(now), index - 6);
    const dayKey = day.toISOString().slice(0, 10);
    const daySessions = sessions.filter(
      (session) => startOfDay(session.createdAt).toISOString().slice(0, 10) === dayKey
    );
    const value =
      daySessions.length > 0
        ? Math.round(daySessions.reduce((acc, session) => acc + getSessionScore(session), 0) / daySessions.length)
        : 0;

    return {
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      value,
    };
  });

  const weeklySubScoreTrends: WeeklySubScoreTrends = {
    communication: [],
    technicalDepth: [],
    clarity: [],
  };

  for (const key of ["communication", "technicalDepth", "clarity"] as const) {
    weeklySubScoreTrends[key] = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(startOfDay(now), index - 6);
      const dayKey = day.toISOString().slice(0, 10);
      const vals = sessions
        .filter((s) => startOfDay(s.createdAt).toISOString().slice(0, 10) === dayKey)
        .map((s) => normalizeTranscriptEvaluation(s.evaluation)?.[key] ?? null)
        .filter((v): v is number => v !== null);
      return {
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        value: vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      };
    });
  }

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const session of sessions) {
    const key = prettifyCategory(session.type || "General");
    const existing = categoryMap.get(key);
    const score = getSessionScore(session);
    if (!existing) {
      categoryMap.set(key, { total: score, count: 1 });
    } else {
      existing.total += score;
      existing.count += 1;
      categoryMap.set(key, existing);
    }
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, values]) => ({
      category,
      score: Math.round(values.total / values.count),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const evaluationInsights = deriveStrengthsAndImprovementsFromEvaluations(sessions);
  const { strengths, improvements } = evaluationInsights ?? deriveStrengthsAndImprovementsFromTranscripts(transcripts);

  const subScores = deriveSubScores(sessions);

  const thumbsUp = feedbackRows.filter(r => r.rating === "up").length;
  const thumbsDown = feedbackRows.filter(r => r.rating === "down").length;
  const feedbackStats: FeedbackStats = { total: feedbackRows.length, thumbsUp, thumbsDown };

  const thirtyDaysAgo = addDays(now, -30);
  const sixtyDaysAgo = addDays(now, -60);
  const currentPeriodSessions = sessions.filter(s => s.createdAt >= thirtyDaysAgo);
  const previousPeriodSessions = sessions.filter(s => s.createdAt >= sixtyDaysAgo && s.createdAt < thirtyDaysAgo);

  const avgFor = (items: SessionRecord[]) =>
    items.length === 0 ? null : items.reduce((acc, s) => acc + getSessionScore(s), 0) / items.length;

  const currentAvg = avgFor(currentPeriodSessions);
  const previousAvg = avgFor(previousPeriodSessions);
  const scoreDelta = currentAvg !== null && previousAvg !== null
    ? Math.round((currentAvg - previousAvg) * 10) / 10
    : null;
  const scoreDeltaPct = currentAvg !== null && previousAvg !== null && previousAvg > 0
    ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100)
    : null;

  let summary: string;
  if (currentPeriodSessions.length === 0) {
    summary = "Start a session to track 30-day progress.";
  } else if (previousPeriodSessions.length === 0) {
    summary = `${currentPeriodSessions.length} session${currentPeriodSessions.length !== 1 ? "s" : ""} in the last 30 days — keep it up to unlock comparisons.`;
  } else if (scoreDelta === null) {
    summary = "Not enough data to compare periods.";
  } else if (scoreDelta > 0) {
    summary = `You're up ${Math.abs(scoreDelta)} points (${scoreDeltaPct}%) vs the prior 30 days.`;
  } else if (scoreDelta < 0) {
    summary = `Down ${Math.abs(scoreDelta)} points vs the prior 30 days — refocus on areas to improve.`;
  } else {
    summary = "Holding steady vs the prior 30 days.";
  }

  const periodComparison: PeriodComparison = {
    currentSessions: currentPeriodSessions.length,
    previousSessions: previousPeriodSessions.length,
    currentAvg: currentAvg !== null ? Math.round(currentAvg) : null,
    previousAvg: previousAvg !== null ? Math.round(previousAvg) : null,
    scoreDelta,
    scoreDeltaPct,
    summary,
  };

  const result: AnalyticsOverviewData = {
    weeklyScores,
    weeklySubScoreTrends,
    monthlyComparison: [
      { label: "This Month", ...thisMonth },
      { label: "Last Month", ...previousMonth },
    ],
    periodComparison,
    categoryBreakdown,
    strengths,
    improvements,
    subScores,
    totalSessions: sessions.length,
    feedbackStats,
  };

  writeCache(analyticsCache, userId, result, ANALYTICS_CACHE_TTL_MS);
  return result;
}
