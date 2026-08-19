import {
  interviewTypeSchema,
  INTERVIEW_TYPE_META,
  INTERVIEW_TYPE_VALUES,
} from "@/lib/interview/domain";
import {
  listMetricSessionsForUser,
  listRecentRecordedMetricSessionsForUser,
} from "@/repositories/interview-metrics-repo";
import {
  addDays,
  calculateStreak,
  deriveStrengthsAndImprovementsFromEvaluations,
  deriveSubScores,
  estimateSessionMinutes,
  formatSessionDate,
  getMonthRange,
  getPreviousMonthRange,
  getRubricScore,
  getSessionScore,
  prepareMetricSessions,
  startOfDay,
} from "./aggregation";
import type {
  DashboardChartPoint,
  DashboardOverviewData,
  DashboardTypeBreakdown,
  PracticeRecentSession,
  SessionRecord,
} from "./types";

export async function getUserSessions(userId: string): Promise<SessionRecord[]> {
  if (!userId) return [];

  return prepareMetricSessions(await listMetricSessionsForUser({ userId }));
}

export async function getRecentPracticeSessionsByUserId(
  userId: string,
  limit = 5
): Promise<PracticeRecentSession[]> {
  if (!userId) return [];

  const sessions = await listRecentRecordedMetricSessionsForUser({ userId, limit });

  return sessions
    .map((session) => {
      const parsedType = interviewTypeSchema.safeParse(session.type);
      if (!parsedType.success) {
        return null;
      }

      return {
        id: session.id,
        role: session.role,
        company: session.company || "General",
        type: parsedType.data,
        score: getSessionScore(session),
        date: formatSessionDate(session.createdAt),
        videoKey: session.videoKey,
      } satisfies PracticeRecentSession;
    })
    .filter((session): session is PracticeRecentSession => session !== null)
    .slice(0, limit);
}

export async function getDashboardOverviewDataUncached(userId: string): Promise<DashboardOverviewData> {
  const sessions = await getUserSessions(userId);
  const now = new Date();
  const last7Days = addDays(now, -7);

  const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
  const sessionsThisWeek = completedSessions.filter((session) => session.createdAt >= last7Days).length;

  const scoredCompleted = completedSessions
    .map((session) => ({ session, score: getRubricScore(session) }))
    .filter((entry): entry is { session: SessionRecord; score: number } => entry.score != null);

  const averageScore =
    scoredCompleted.length > 0
      ? Math.round(
          scoredCompleted.reduce((acc, entry) => acc + entry.score, 0) / scoredCompleted.length,
        )
      : null;

  const thisMonthRange = getMonthRange(now);
  const previousMonthRange = getPreviousMonthRange(now);

  const thisMonthScored = scoredCompleted.filter(
    (entry) =>
      entry.session.createdAt >= thisMonthRange.start &&
      entry.session.createdAt < thisMonthRange.end,
  );
  const previousMonthScored = scoredCompleted.filter(
    (entry) =>
      entry.session.createdAt >= previousMonthRange.start &&
      entry.session.createdAt < previousMonthRange.end,
  );

  const thisMonthAverage =
    thisMonthScored.length > 0
      ? Math.round(
          thisMonthScored.reduce((acc, entry) => acc + entry.score, 0) / thisMonthScored.length,
        )
      : 0;

  const previousMonthAverage =
    previousMonthScored.length > 0
      ? Math.round(
          previousMonthScored.reduce((acc, entry) => acc + entry.score, 0) /
            previousMonthScored.length,
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

  const recentSessions = completedSessions.slice(0, 5).map((session) => {
    const parsedType = interviewTypeSchema.safeParse(session.type);
    return {
      id: session.id,
      role: session.role,
      company: session.company || "General",
      type: parsedType.success ? parsedType.data : null,
      difficulty: session.difficulty ?? null,
      score: getRubricScore(session),
      duration: `${estimateSessionMinutes(session)} min`,
      date: formatSessionDate(session.createdAt),
      videoKey: session.videoKey ?? null,
    };
  });

  // Daily chart: only completed sessions with a real rubric score (no progress placeholders).
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(startOfDay(now), index - 6);
    const dayKey = day.toISOString().slice(0, 10);
    const dayScored = scoredCompleted.filter(
      (entry) => startOfDay(entry.session.createdAt).toISOString().slice(0, 10) === dayKey,
    );
    if (dayScored.length === 0) {
      return null;
    }
    return {
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(dayScored.reduce((acc, entry) => acc + entry.score, 0) / dayScored.length),
    };
  }).filter((point): point is DashboardChartPoint => point != null);

  const byType: DashboardTypeBreakdown[] = [];
  for (const type of INTERVIEW_TYPE_VALUES) {
    const typed = completedSessions.filter((session) => {
      const parsed = interviewTypeSchema.safeParse(session.type);
      return parsed.success && parsed.data === type;
    });
    if (typed.length === 0) continue;

    const scored = typed
      .map((session) => getRubricScore(session))
      .filter((score): score is number => score != null);
    const recentScores = [...typed]
      .reverse()
      .map((session) => getRubricScore(session))
      .filter((score): score is number => score != null)
      .slice(-5);

    byType.push({
      type,
      label: INTERVIEW_TYPE_META[type].label,
      count: typed.length,
      avgScore:
        scored.length > 0
          ? Math.round(scored.reduce((acc, score) => acc + score, 0) / scored.length)
          : null,
      lastScore: scored.length > 0 ? scored[0]! : null,
      recentScores,
    });
  }

  const subScores = deriveSubScores(completedSessions);
  const insights = deriveStrengthsAndImprovementsFromEvaluations(completedSessions);

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
        value: averageScore == null ? "—" : String(averageScore),
        change: `${averageDelta >= 0 ? "+" : ""}${averageDelta} pts vs last month`,
        suffix: averageScore == null ? undefined : "/100",
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
        suffix: "d",
        iconKey: "streak",
      },
    ],
    recentSessions,
    chartData: lastSevenDays,
    byType,
    subScores,
    topStrength: insights?.strengths[0] ?? null,
    topFocus: insights?.improvements[0] ?? null,
  };

  return result;
}
