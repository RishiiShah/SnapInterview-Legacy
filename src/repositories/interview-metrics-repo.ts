import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type MetricsSessionRecord = {
  id: string;
  role: string;
  company: string | null;
  videoKey: string | null;
  type: string;
  difficulty: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABORTED";
  durationMinutes: number | null;
  questionCount: number;
  currentQuestion: number;
  evaluation: unknown;
  createdAt: Date;
};

export type TranscriptMetricRecord = {
  question: string;
  answer: string;
  createdAt: Date;
};

const metricSessionSelect = {
  id: true,
  role: true,
  company: true,
  videoKey: true,
  type: true,
  difficulty: true,
  status: true,
  durationMinutes: true,
  questionCount: true,
  currentQuestion: true,
  evaluation: true,
  createdAt: true,
} satisfies Prisma.InterviewSessionSelect;

const metricSessionOrder = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.InterviewSessionOrderByWithRelationInput[];

export const DEFAULT_METRIC_SESSIONS_LIMIT = 200;

export async function listMetricSessionsForUser(params: {
  userId: string;
  status?: "COMPLETED";
  limit?: number;
  createdAfter?: Date;
}): Promise<MetricsSessionRecord[]> {
  const { userId, status, limit = DEFAULT_METRIC_SESSIONS_LIMIT, createdAfter } = params;
  if (!userId) return [];

  return prisma.interviewSession.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
    },
    orderBy: metricSessionOrder,
    select: metricSessionSelect,
    take: limit,
  });
}

export async function listRecentRecordedMetricSessionsForUser(params: {
  userId: string;
  limit: number;
}): Promise<MetricsSessionRecord[]> {
  const { userId, limit } = params;
  if (!userId) return [];

  return prisma.interviewSession.findMany({
    where: {
      userId,
      deletedAt: null,
      videoKey: { not: null },
    },
    orderBy: metricSessionOrder,
    select: metricSessionSelect,
    take: Math.max(limit * 3, limit),
  });
}

export async function listMetricTranscriptsForUser(params: {
  userId: string;
  limit: number;
}): Promise<TranscriptMetricRecord[]> {
  const { userId, limit } = params;
  if (!userId) return [];

  return prisma.transcriptEntry.findMany({
    where: {
      interviewSession: {
        userId,
        deletedAt: null,
      },
    },
    select: {
      question: true,
      answer: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}

export async function groupQuestionFeedbackForUser(
  userId: string,
): Promise<Array<{ rating: string; count: number }>> {
  if (!userId) return [];

  const groups = await prisma.questionFeedback.groupBy({
    by: ["rating"],
    where: { interviewSession: { userId, deletedAt: null } },
    _count: { _all: true },
  });

  return groups.map(({ rating, _count }) => ({ rating, count: _count._all }));
}
