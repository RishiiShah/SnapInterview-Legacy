import {
  interviewTypeSchema,
  INTERVIEW_TYPE_META,
} from "@/lib/interview/domain";
import {
  groupQuestionFeedbackForUser,
  listMetricSessionsForUser,
  listMetricTranscriptsForUser,
} from "@/repositories/interview-metrics-repo";
import {
  addDays,
  buildDailyTrend,
  buildMonthlyTrend,
  buildSubScoreTrendSets,
  buildWeeklyTrend,
  deriveStrengthsAndImprovementsFromEvaluations,
  deriveStrengthsAndImprovementsFromTranscripts,
  deriveSubScores,
  estimateSessionMinutes,
  getMonthRange,
  getPreviousMonthRange,
  getSessionScore,
  prepareMetricSessions,
  prettifyCategory,
  startOfDay,
} from "./aggregation";
import type {
  AnalyticsOverviewData,
  FeedbackStats,
  PeriodComparison,
  SessionRecord,
  TranscriptRecord,
} from "./types";

export async function getCompletedUserSessionsByUserId(userId: string): Promise<SessionRecord[]> {
  if (!userId) return [];

  return prepareMetricSessions(await listMetricSessionsForUser({ userId, status: "COMPLETED" }));
}

export async function getUserTranscripts(userId: string): Promise<TranscriptRecord[]> {
  if (!userId) return [];

  return listMetricTranscriptsForUser({ userId, limit: 500 });
}

export async function getAnalyticsOverviewDataUncached(userId: string): Promise<AnalyticsOverviewData> {
  const [sessions, feedbackCounts] = await Promise.all([
    getCompletedUserSessionsByUserId(userId),
    groupQuestionFeedbackForUser(userId),
  ]);
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

  const dailyTrend = buildDailyTrend(sessions, now, 14);
  const weeklyTrend = buildWeeklyTrend(sessions, now, 8);
  const monthlyTrend = buildMonthlyTrend(sessions, now, 6);
  const subScoreTrends = buildSubScoreTrendSets(sessions, now);

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const session of sessions) {
    const parsedType = interviewTypeSchema.safeParse(session.type);
    const key = parsedType.success
      ? INTERVIEW_TYPE_META[parsedType.data].label
      : prettifyCategory(session.type || "General");
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
  const transcriptInsights = evaluationInsights
    ? null
    : deriveStrengthsAndImprovementsFromTranscripts(await getUserTranscripts(userId));
  const { strengths, improvements } = evaluationInsights ?? transcriptInsights!;

  const subScores = deriveSubScores(sessions);

  const feedbackCountByRating = new Map(
    feedbackCounts.map((entry) => [entry.rating, entry.count]),
  );
  const thumbsUp = feedbackCountByRating.get("up") ?? 0;
  const thumbsDown = feedbackCountByRating.get("down") ?? 0;
  const feedbackStats: FeedbackStats = {
    total: Array.from(feedbackCountByRating.values()).reduce((total, count) => total + count, 0),
    thumbsUp,
    thumbsDown,
  };

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
    summary = `${currentPeriodSessions.length} session${currentPeriodSessions.length !== 1 ? "s" : ""} in the last 30 days. Keep it up to unlock comparisons.`;
  } else if (scoreDelta === null) {
    summary = "Not enough data to compare periods.";
  } else if (scoreDelta > 0) {
    summary = `You\x27re up ${Math.abs(scoreDelta)} points (${scoreDeltaPct}%) vs the prior 30 days.`;
  } else if (scoreDelta < 0) {
    summary = `Down ${Math.abs(scoreDelta)} points vs the prior 30 days. Refocus on areas to improve.`;
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
    dailyTrend,
    weeklyTrend,
    monthlyTrend,
    subScoreTrends,
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

  return result;
}
