import type { InterviewType } from "@/lib/interview/domain";
import { prisma } from "@/lib/prisma";
import { TYPE_FILTER_ALIASES } from "./session-repo";

export type CompletedSessionCard = {
  id: string;
  role: string;
  company: string | null;
  type: InterviewType;
  videoKey: string | null;
  score: number | null;
  createdAt: Date;
};

export type CompletedSessionCursor = {
  createdAt: Date;
  id: string;
};

export function extractEvaluationScore(evaluation: unknown): number | null {
  if (!evaluation || typeof evaluation !== "object") return null;
  const evalData = evaluation as {
    score?: unknown;
    overallScore?: unknown;
    v2?: { overallScore?: unknown; score?: unknown };
  };
  if (typeof evalData.score === "number" && !Number.isNaN(evalData.score)) {
    return evalData.score;
  }
  if (typeof evalData.overallScore === "number" && !Number.isNaN(evalData.overallScore)) {
    return evalData.overallScore;
  }
  if (typeof evalData.v2?.overallScore === "number" && !Number.isNaN(evalData.v2.overallScore)) {
    return evalData.v2.overallScore;
  }
  if (typeof evalData.v2?.score === "number" && !Number.isNaN(evalData.v2.score)) {
    return evalData.v2.score;
  }
  return null;
}

export function mapCompletedSessionCard(s: {
  id: string;
  role: string;
  company: string | null;
  type: string;
  videoKey: string | null;
  evaluation: unknown;
  questionCount: number;
  currentQuestion: number;
  createdAt: Date;
}): CompletedSessionCard {
  const score = extractEvaluationScore(s.evaluation);

  return {
    id: s.id,
    role: s.role,
    company: s.company,
    type: s.type as InterviewType,
    videoKey: s.videoKey,
    score,
    createdAt: s.createdAt,
  };
}

export async function listCompletedSessionsForUser(params: {
  userId: string;
  limit: number;
  offset?: number;
  cursor?: CompletedSessionCursor;
  interviewType?: InterviewType;
}): Promise<{
  sessions: CompletedSessionCard[];
  hasMore: boolean;
  nextCursor: CompletedSessionCursor | null;
}> {
  const { userId, limit, offset = 0, cursor, interviewType } = params;

  const rows = await prisma.interviewSession.findMany({
    where: {
      userId,
      deletedAt: null,
      status: "COMPLETED",
      ...(interviewType ? { type: { in: TYPE_FILTER_ALIASES[interviewType] } } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? {} : { skip: offset }),
    take: limit + 1,
    select: {
      id: true,
      role: true,
      company: true,
      type: true,
      videoKey: true,
      evaluation: true,
      questionCount: true,
      currentQuestion: true,
      status: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const sessions = rows.slice(0, limit).map(mapCompletedSessionCard);

  const lastSession = sessions.at(-1);
  return {
    sessions,
    hasMore,
    nextCursor: hasMore && lastSession
      ? { createdAt: lastSession.createdAt, id: lastSession.id }
      : null,
  };
}

export async function getCompletedSessionCardForUser(params: {
  userId: string;
  interviewId: string;
}): Promise<CompletedSessionCard | null> {
  const row = await prisma.interviewSession.findFirst({
    where: {
      id: params.interviewId,
      userId: params.userId,
      deletedAt: null,
      status: "COMPLETED",
    },
    select: {
      id: true,
      role: true,
      company: true,
      type: true,
      videoKey: true,
      evaluation: true,
      questionCount: true,
      currentQuestion: true,
      createdAt: true,
    },
  });

  return row ? mapCompletedSessionCard(row) : null;
}
