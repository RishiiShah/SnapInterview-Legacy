import { normalizeTranscriptEvaluation } from "@/lib/interview/evaluation";
import { formatMonthBucketRange, formatWeekBucketRange } from "@/lib/interview/analytics-display";
import type { SubScoreDimensionKey } from "@/lib/interview/sub-score-dimensions";
import type { MetricsSessionRecord } from "@/repositories/interview-metrics-repo";
import type {
  AnalyticsTrendPoint,
  DashboardChartPoint,
  SessionRecord,
  SubScores,
  SubScoreTrendSets,
  TranscriptRecord,
  WeeklySubScoreTrends,
} from "./types";

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const startOfDay = (date: Date): Date => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const addDays = (date: Date, days: number): Date => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

export const startOfWeekMonday = (date: Date): Date => {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const mondayOffset = (weekday + 6) % 7;
  return addDays(day, -mondayOffset);
};

export const getMonthRange = (base: Date): { start: Date; end: Date } => {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
};

export const getPreviousMonthRange = (base: Date): { start: Date; end: Date } => {
  const start = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const end = new Date(base.getFullYear(), base.getMonth(), 1);
  return { start, end };
};

export const formatSessionDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const estimateSessionMinutes = (session: SessionRecord): number => {
  if (session.durationMinutes && session.status === "COMPLETED") {
    return session.durationMinutes;
  }
  const questions = Math.max(1, session.questionCount);
  const answered = clamp(session.currentQuestion, 0, questions);
  const effectiveAnswered = session.status === "COMPLETED" ? questions : Math.max(answered, 1);
  return Math.max(5, Math.round(effectiveAnswered * 2.5));
};

export const deriveSessionScore = (session: SessionRecord): number => {
  const questions = Math.max(1, session.questionCount);
  const answered = clamp(session.currentQuestion, 0, questions);
  const completionRatio = answered / questions;

  let score = completionRatio * 80;
  if (session.status === "COMPLETED") score += 20;
  if (session.status === "ABORTED") score -= 10;

  return clamp(Math.round(score), 0, 100);
};

export const getEvaluationScore = (evaluation: unknown): number | null => {
  const normalized = normalizeTranscriptEvaluation(evaluation);
  if (!normalized) {
    return null;
  }

  return normalized.score;
};

export const getSessionScore = (session: SessionRecord): number => {
  if (session._score !== undefined) {
    return session._score;
  }
  const evaluationScore = getEvaluationScore(session.evaluation);
  if (evaluationScore !== null) {
    return evaluationScore;
  }

  return deriveSessionScore(session);
};

/** Rubric score from evaluation only — never invent progress placeholders. */
export const getRubricScore = (session: SessionRecord): number | null => {
  if (session._normalizedEvaluation?.score != null) {
    return session._normalizedEvaluation.score;
  }
  return getEvaluationScore(session.evaluation);
};

export function averageSessionScore(items: SessionRecord[]): number | null {
  if (items.length === 0) return null;
  return Math.round(items.reduce((acc, session) => acc + getSessionScore(session), 0) / items.length);
}

export function buildDailyTrend(sessions: SessionRecord[], now: Date, days: number): AnalyticsTrendPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(startOfDay(now), index - (days - 1));
    const dayKey = day.toISOString().slice(0, 10);
    const daySessions = sessions.filter(
      (session) => startOfDay(session.createdAt).toISOString().slice(0, 10) === dayKey,
    );
    const avgScore = averageSessionScore(daySessions);
    return {
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avgScore,
      sessionCount: daySessions.length,
    };
  });
}

export function buildWeeklyTrend(sessions: SessionRecord[], now: Date, weeks: number): AnalyticsTrendPoint[] {
  const currentWeekStart = startOfWeekMonday(now);
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(currentWeekStart, (index - (weeks - 1)) * 7);
    const weekEnd = addDays(weekStart, 7);
    const weekSessions = sessions.filter(
      (session) => session.createdAt >= weekStart && session.createdAt < weekEnd,
    );
    const avgScore = averageSessionScore(weekSessions);
    return {
      label: formatWeekBucketRange(weekStart, now),
      avgScore,
      sessionCount: weekSessions.length,
    };
  });
}

export function buildMonthlyTrend(sessions: SessionRecord[], now: Date, months: number): AnalyticsTrendPoint[] {
  return Array.from({ length: months }, (_, index) => {
    const monthOffset = index - (months - 1);
    const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const monthSessions = sessions.filter(
      (session) => session.createdAt >= start && session.createdAt < end,
    );
    const avgScore = averageSessionScore(monthSessions);
    return {
      label: formatMonthBucketRange(start),
      avgScore,
      sessionCount: monthSessions.length,
    };
  });
}

export const SUB_SCORE_KEYS: SubScoreDimensionKey[] = ["communication", "technicalDepth", "clarity"];

export function getSessionEvaluation(session: SessionRecord) {
  return session._normalizedEvaluation !== undefined
    ? session._normalizedEvaluation
    : normalizeTranscriptEvaluation(session.evaluation);
}

export function sessionSubScore(session: SessionRecord, key: SubScoreDimensionKey): number | null {
  const evaluation = getSessionEvaluation(session);
  const value = evaluation?.[key];
  return typeof value === "number" ? value : null;
}

export function averageSubScoreForSessions(sessions: SessionRecord[], key: SubScoreDimensionKey): number | null {
  const values = sessions
    .map((session) => sessionSubScore(session, key))
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

export function emptySubScoreTrends(): WeeklySubScoreTrends {
  return { communication: [], technicalDepth: [], clarity: [] };
}

export function buildSubScoreDailyTrend(
  sessions: SessionRecord[],
  now: Date,
  days: number,
  key: SubScoreDimensionKey,
): DashboardChartPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(startOfDay(now), index - (days - 1));
    const dayKey = day.toISOString().slice(0, 10);
    const daySessions = sessions.filter(
      (session) => startOfDay(session.createdAt).toISOString().slice(0, 10) === dayKey,
    );
    const avg = averageSubScoreForSessions(daySessions, key);
    return {
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: avg ?? 0,
    };
  });
}

export function buildSubScoreWeeklyTrend(
  sessions: SessionRecord[],
  now: Date,
  weeks: number,
  key: SubScoreDimensionKey,
): DashboardChartPoint[] {
  const currentWeekStart = startOfWeekMonday(now);
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(currentWeekStart, (index - (weeks - 1)) * 7);
    const weekEnd = addDays(weekStart, 7);
    const weekSessions = sessions.filter(
      (session) => session.createdAt >= weekStart && session.createdAt < weekEnd,
    );
    const avg = averageSubScoreForSessions(weekSessions, key);
    return {
      label: formatWeekBucketRange(weekStart, now),
      value: avg ?? 0,
    };
  });
}

export function buildSubScoreMonthlyTrend(
  sessions: SessionRecord[],
  now: Date,
  months: number,
  key: SubScoreDimensionKey,
): DashboardChartPoint[] {
  return Array.from({ length: months }, (_, index) => {
    const monthOffset = index - (months - 1);
    const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const monthSessions = sessions.filter(
      (session) => session.createdAt >= start && session.createdAt < end,
    );
    const avg = averageSubScoreForSessions(monthSessions, key);
    return {
      label: formatMonthBucketRange(start),
      value: avg ?? 0,
    };
  });
}

export function buildSubScoreTrendSets(sessions: SessionRecord[], now: Date): SubScoreTrendSets {
  const daily = emptySubScoreTrends();
  const weekly = emptySubScoreTrends();
  const monthly = emptySubScoreTrends();

  for (const key of SUB_SCORE_KEYS) {
    daily[key] = buildSubScoreDailyTrend(sessions, now, 14, key);
    weekly[key] = buildSubScoreWeeklyTrend(sessions, now, 8, key);
    monthly[key] = buildSubScoreMonthlyTrend(sessions, now, 6, key);
  }

  return { daily, weekly, monthly };
}

export function calculateStreak(sessions: SessionRecord[], now: Date): number {
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

export function prepareMetricSessions(sessions: MetricsSessionRecord[]): SessionRecord[] {
  return sessions.map((session) => {
    const _normalizedEvaluation = normalizeTranscriptEvaluation(session.evaluation);
    const _score = _normalizedEvaluation?.score ?? deriveSessionScore(session);
    return { ...session, _normalizedEvaluation, _score };
  });
}

export function rankKeywordEntries(entries: Array<[string, number]>, fallback: string[] = []): string[] {
  if (entries.length === 0) return fallback;

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

export function deriveSubScores(sessions: SessionRecord[]): SubScores {
  const comms: number[] = [];
  const tech: number[] = [];
  const clarity: number[] = [];

  for (const session of sessions) {
    const evaluation = getSessionEvaluation(session);
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

export function deriveStrengthsAndImprovementsFromEvaluations(sessions: SessionRecord[]): {
  strengths: string[];
  improvements: string[];
} | null {
  const strengthCounts = new Map<string, number>();
  const improvementCounts = new Map<string, number>();

  for (const session of sessions) {
    const evaluation = getSessionEvaluation(session);
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

export function deriveStrengthsAndImprovementsFromTranscripts(transcripts: TranscriptRecord[]): {
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

export const prettifyCategory = (value: string): string => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
