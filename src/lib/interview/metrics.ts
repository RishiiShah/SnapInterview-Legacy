import { prisma } from "@/lib/prisma";

type SessionRecord = {
  id: string;
  role: string;
  company: string | null;
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
};

type DashboardChartPoint = {
  label: string;
  value: number;
};

export type PracticeRecentSession = {
  id: string;
  role: string;
  company: string;
  type: string;
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

export type AnalyticsOverviewData = {
  weeklyScores: DashboardChartPoint[];
  monthlyComparison: AnalyticsMonthlyComparison[];
  categoryBreakdown: AnalyticsCategoryScore[];
  strengths: string[];
  improvements: string[];
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
  if (!evaluation || typeof evaluation !== "object") {
    return null;
  }

  const candidate = (evaluation as { score?: unknown }).score;
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    return null;
  }

  return clamp(Math.round(candidate), 0, 100);
};

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

async function getUserSessions(email: string): Promise<SessionRecord[]> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (!user) return [];

  return getUserSessionsByUserId(user.id);
}

async function getUserSessionsByUserId(userId: string): Promise<SessionRecord[]> {
  if (!userId) return [];

  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      company: true,
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
  const sessions = await getUserSessionsByUserId(userId);

  return sessions.slice(0, limit).map((session) => ({
    id: session.id,
    role: session.role,
    company: session.company || "Unknown",
    type: session.type,
    score: getSessionScore(session),
    date: formatSessionDate(session.createdAt),
  }));
}

async function getUserTranscripts(email: string): Promise<TranscriptRecord[]> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (!user) return [];

  const transcripts = await prisma.transcriptEntry.findMany({
    where: {
      interviewSession: {
        userId: user.id,
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

function rankKeywordEntries(entries: Array<[string, number]>, fallback: string[]): string[] {
  if (entries.length === 0) return fallback;

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

function deriveStrengthsAndImprovementsFromTranscripts(transcripts: TranscriptRecord[]): {
  strengths: string[];
  improvements: string[];
} {
  if (transcripts.length === 0) {
    return {
      strengths: ["Communication clarity", "STAR method structure", "Leadership examples"],
      improvements: ["System scalability", "Time complexity analysis", "Edge case handling"],
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

  const strengths = rankKeywordEntries(Array.from(positiveCounts.entries()), [
    "Communication clarity",
    "STAR method structure",
    "Leadership examples",
  ]);

  const improvements = rankKeywordEntries(Array.from(improvementCounts.entries()), [
    "System scalability",
    "Time complexity analysis",
    "Edge case handling",
  ]);

  return { strengths, improvements };
}

export async function getDashboardOverviewData(email: string): Promise<DashboardOverviewData> {
  const sessions = await getUserSessions(email);
  const now = new Date();
  const last7Days = addDays(now, -7);

  const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
  const sessionsThisWeek = sessions.filter((session) => session.createdAt >= last7Days).length;

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

  const recentSessions = sessions.slice(0, 5).map((session) => ({
    id: session.id,
    role: session.role,
    company: session.company || "Unknown",
    score: getSessionScore(session),
    duration: `${estimateSessionMinutes(session)} min`,
    date: formatSessionDate(session.createdAt),
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

  return {
    stats: [
      {
        label: "Interviews Completed",
        value: String(sessions.length),
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
}

const prettifyCategory = (value: string): string => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export async function getAnalyticsOverviewData(email: string): Promise<AnalyticsOverviewData> {
  const sessions = await getUserSessions(email);
  const transcripts = await getUserTranscripts(email);
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

  const fallbackCategories: AnalyticsCategoryScore[] = [
    { category: "Behavioral", score: 0 },
    { category: "Technical", score: 0 },
    { category: "System Design", score: 0 },
    { category: "Leadership", score: 0 },
  ];

  const resolvedCategories = categoryBreakdown.length > 0 ? categoryBreakdown : fallbackCategories;
  const { strengths, improvements } = deriveStrengthsAndImprovementsFromTranscripts(transcripts);

  return {
    weeklyScores,
    monthlyComparison: [
      { label: "This Month", ...thisMonth },
      { label: "Last Month", ...previousMonth },
    ],
    categoryBreakdown: resolvedCategories,
    strengths,
    improvements,
  };
}
