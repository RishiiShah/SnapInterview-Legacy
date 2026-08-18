import type { InterviewType } from "@/lib/interview/domain";
import { prisma } from "@/lib/prisma";
import { TYPE_FILTER_ALIASES } from "./session-repo";

export type CompletedSessionCard = {
  id: string;
  role: string;
  company: string | null;
  type: InterviewType;
  videoKey: string | null;
  score: number;
  createdAt: Date;
};

export type CompletedSessionCursor = {
  createdAt: Date;
  id: string;
};

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
  const evalData = s.evaluation as { score?: number } | null;
  const score = typeof evalData?.score === "number"
    ? evalData.score
    : Math.round(Math.min(100, Math.max(0, (Math.min(s.currentQuestion, s.questionCount) / Math.max(1, s.questionCount)) * 80 + 20)));

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
