import type { Prisma } from "@/generated/prisma/client";
import { unstable_cache } from "next/cache";

import AdminAnalyticsDashboard from "@/components/admin/AdminAnalyticsDashboard";
import { getAdminDailySignupCounts } from "@/lib/admin/analytics-queries";
import { normalizeTranscriptEvaluation } from "@/lib/interview/evaluation";
import { prisma } from "@/lib/prisma";

const hasEvaluation = { not: "DbNull" } satisfies Prisma.JsonNullableFilter;
const ADMIN_ANALYTICS_TAG = "admin-analytics-v1";

type AiHealthTone = "default" | "warn" | "danger" | "good";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function loadAdminAnalyticsData() {
  const now = new Date();
  const today = startOfDay(now);
  const last14Start = addDays(today, -13);
  const last30Start = addDays(today, -29);
  const previous30Start = addDays(today, -59);
  const previous7Start = addDays(today, -13);
  const last7Start = addDays(today, -6);

  const [
    signupsByDay,
    usersBeforePeriod,
    activeSessions,
    completedCount,
    evaluatedSessionsCount,
    sessionsWithVideoCount,
    totalUsers,
    usersCreatedLast30,
    usersWithSessionLast30,
    usersWithSessionPrevious30,
    recentCohortUsers,
    recentCohortReturnRows,
    abortedCount,
    recentEvaluations,
  ] = await Promise.all([
    getAdminDailySignupCounts(last14Start),
    prisma.user.count({ where: { createdAt: { lt: last14Start } } }),
    prisma.interviewSession.count({ where: { deletedAt: null } }),
    prisma.interviewSession.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    prisma.interviewSession.count({
      where: { deletedAt: null, status: "COMPLETED", evaluation: hasEvaluation },
    }),
    prisma.interviewSession.count({
      where: { deletedAt: null, videoKey: { not: null } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last30Start } } }),
    prisma.interviewSession.findMany({
      where: { deletedAt: null, createdAt: { gte: last30Start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.interviewSession.findMany({
      where: { deletedAt: null, createdAt: { gte: previous30Start, lt: last30Start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: previous7Start, lt: last7Start } },
      select: { id: true },
    }),
    prisma.interviewSession.findMany({
      where: { deletedAt: null, createdAt: { gte: last7Start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.interviewSession.count({ where: { deletedAt: null, status: "ABORTED" } }),
    prisma.interviewSession.findMany({
      where: { deletedAt: null, status: "COMPLETED", evaluation: hasEvaluation },
      select: { evaluation: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  let runningUserTotal = usersBeforePeriod;
  const userBase = Array.from({ length: 14 }).map((_, index) => {
    const day = addDays(last14Start, index);
    const key = day.toISOString().slice(0, 10);
    runningUserTotal += signupsByDay.get(key) ?? 0;
    return {
      label: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      axisLabel: day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      totalUsers: runningUserTotal,
    };
  });

  const startedCount = activeSessions;
  const funnel = [
    { label: "Started", value: startedCount },
    { label: "Completed", value: completedCount },
    { label: "Evaluated", value: evaluatedSessionsCount },
    { label: "Has Recording", value: sessionsWithVideoCount },
  ];

  const usersWithSessionLast30Count = usersWithSessionLast30.length;
  const usersWithSessionPrevious30Count = usersWithSessionPrevious30.length;
  const returning30dRate =
    usersWithSessionPrevious30Count > 0
      ? Math.round((usersWithSessionLast30Count / usersWithSessionPrevious30Count) * 100)
      : 0;

  const recentCohortSet = new Set(recentCohortUsers.map((u) => u.id));
  const returnedCohortCount = recentCohortReturnRows.filter((row) =>
    recentCohortSet.has(row.userId),
  ).length;
  const weeklyCohortRetention =
    recentCohortUsers.length > 0
      ? Math.round((returnedCohortCount / recentCohortUsers.length) * 100)
      : 0;

  const retention = [
    {
      label: "Total Users",
      value: totalUsers.toLocaleString(),
      hint: "Registered accounts",
    },
    {
      label: "New Users (30d)",
      value: usersCreatedLast30.toLocaleString(),
      hint: "Accounts created in last 30 days",
    },
    {
      label: "Active Users (30d)",
      value: usersWithSessionLast30Count.toLocaleString(),
      hint: "Users with at least one session",
    },
    {
      label: "Returning Rate",
      value: `${returning30dRate}%`,
      hint: "Active users vs previous 30-day active base",
    },
    {
      label: "1-Week Cohort Retention",
      value: `${weeklyCohortRetention}%`,
      hint: "Users created in prior week and active this week",
    },
  ];

  const normalizedEvaluations = recentEvaluations
    .map((row) => normalizeTranscriptEvaluation(row.evaluation))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const scores = normalizedEvaluations.map((entry) => entry.score);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((acc, val) => acc + val, 0) / scores.length)
      : null;

  const getSubScoreAvg = (
    key: "communication" | "technicalDepth" | "clarity",
  ): number | null => {
    const values = normalizedEvaluations
      .map((entry) => entry[key])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    return Math.round(values.reduce((acc, val) => acc + val, 0) / values.length);
  };

  const completedWithoutEvaluation = completedCount - evaluatedSessionsCount;
  const evalCoveragePct =
    completedCount > 0
      ? Math.round((evaluatedSessionsCount / completedCount) * 100)
      : 0;

  const abortRate =
    startedCount > 0 ? Math.round((abortedCount / startedCount) * 100) : 0;

  const aiHealthCards: Array<{
    label: string;
    value: string;
    hint: string;
    tone: AiHealthTone;
  }> = [
    {
      label: "Evaluation Coverage",
      value: `${evalCoveragePct}%`,
      hint: `${evaluatedSessionsCount.toLocaleString()} of ${completedCount.toLocaleString()} completed sessions`,
      tone: evalCoveragePct >= 90 ? "good" : evalCoveragePct >= 70 ? "warn" : "danger",
    },
    {
      label: "Completed Without Evaluation",
      value: completedWithoutEvaluation.toLocaleString(),
      hint: "Potential AI failure or skipped processing",
      tone: completedWithoutEvaluation > 0 ? "warn" : "good",
    },
    {
      label: "Abort Rate",
      value: `${abortRate}%`,
      hint: `${abortedCount.toLocaleString()} aborted sessions out of ${startedCount.toLocaleString()}`,
      tone: abortRate >= 25 ? "danger" : abortRate >= 15 ? "warn" : "default",
    },
  ];

  return {
    userBase,
    funnel,
    retention,
    aiHealthCards,
    averageScore,
    subScores: {
      communication: getSubScoreAvg("communication"),
      technicalDepth: getSubScoreAvg("technicalDepth"),
      clarity: getSubScoreAvg("clarity"),
    },
  };
}

const getAdminAnalyticsData = unstable_cache(
  loadAdminAnalyticsData,
  [ADMIN_ANALYTICS_TAG],
  { revalidate: 60, tags: [ADMIN_ANALYTICS_TAG] },
);

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminAnalyticsData();
  return <AdminAnalyticsDashboard {...analytics} />;
}
