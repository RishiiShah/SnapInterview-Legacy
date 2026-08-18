import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import type { Difficulty, InterviewPersona, InterviewType } from "@/lib/interview/domain";
import { prisma } from "@/lib/prisma";

export const TYPE_FILTER_ALIASES: Record<InterviewType, string[]> = {
  "recruiter-screen": ["recruiter-screen"],
  "behavioral-leadership": ["behavioral-leadership", "behavioral", "leadership"],
  "coding-algorithms": ["coding-algorithms", "technical", "coding"],
  "system-design": ["system-design"],
  "domain-role": ["domain-role"],
  "take-home": ["take-home"],
  "hiring-manager": ["hiring-manager"],
  "bar-raiser": ["bar-raiser"],
};

export const interviewSessionStateSelect = {
  id: true,
  status: true,
  videoUrl: true,
  videoKey: true,
  questionCount: true,
  durationMinutes: true,
  currentQuestion: true,
  persona: true,
  type: true,
  createdAt: true,
} satisfies Prisma.InterviewSessionSelect;

export const interviewSessionChatSelect = {
  id: true,
  status: true,
  role: true,
  company: true,
  type: true,
  difficulty: true,
  persona: true,
  jobDescription: true,
  resumeUrl: true,
  resumeText: true,
  questionCount: true,
  durationMinutes: true,
  currentQuestion: true,
  focusAreas: true,
  sessionPlan: true,
  createdAt: true,
  transcript: {
    select: {
      question: true,
      answer: true,
      order: true,
    },
    orderBy: {
      order: "desc",
    },
    take: 1,
  },
} satisfies Prisma.InterviewSessionSelect;

export const interviewSessionEvaluationSelect = {
  id: true,
  role: true,
  company: true,
  type: true,
  difficulty: true,
  persona: true,
  jobDescription: true,
  resumeUrl: true,
  resumeText: true,
  questionCount: true,
  durationMinutes: true,
  currentQuestion: true,
  focusAreas: true,
  sessionPlan: true,
  evaluation: true,
  createdAt: true,
  evaluationStartedAt: true,
  evaluationClaimVersion: true,
  transcript: {
    select: {
      question: true,
      answer: true,
      order: true,
    },
    orderBy: {
      order: "asc",
    },
  },
} satisfies Prisma.InterviewSessionSelect;

export const interviewSessionSelectByView = {
  state: interviewSessionStateSelect,
  chat: interviewSessionChatSelect,
  evaluation: interviewSessionEvaluationSelect,
} as const;

export type InterviewSessionView = keyof typeof interviewSessionSelectByView;

export type InterviewSessionByView = {
  [TView in InterviewSessionView]: Prisma.InterviewSessionGetPayload<{
    select: (typeof interviewSessionSelectByView)[TView];
  }>;
};

export async function getInterviewSession<TView extends InterviewSessionView>(params: {
  interviewId: string;
  userId: string;
  view: TView;
}): Promise<InterviewSessionByView[TView] | null> {
  const { interviewId, userId, view } = params;

  const session = await prisma.interviewSession.findFirst({
    where: { id: interviewId, userId, deletedAt: null },
    select: interviewSessionSelectByView[view],
  });

  return session as InterviewSessionByView[TView] | null;
}

export async function createInterviewSession(params: {
  id?: string;
  userId: string;
  role: string;
  company?: string | null;
  type: InterviewType;
  difficulty: Difficulty;
  persona?: InterviewPersona;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  resumeText?: string | null;
  durationMinutes?: number;
  questionCount?: number;
  focusAreas?: Prisma.InputJsonValue;
  sessionPlan?: Prisma.InputJsonValue;
}) {
  const {
    id,
    userId,
    role,
    company,
    type,
    difficulty,
    persona,
    jobDescription,
    resumeUrl,
    resumeText,
    durationMinutes,
    questionCount,
    focusAreas,
    sessionPlan,
  } = params;

  return prisma.interviewSession.create({
    data: {
      id,
      userId,
      role,
      company: company ?? null,
      type,
      difficulty,
      persona: persona ?? null,
      jobDescription: jobDescription ?? null,
      resumeUrl: resumeUrl ?? null,
      resumeText: resumeText ?? null,
      durationMinutes: durationMinutes ?? 30,
      questionCount: questionCount ?? 10,
      focusAreas: focusAreas ?? undefined,
      sessionPlan: sessionPlan ?? undefined,
    },
    select: {
      id: true,
    },
  });
}

export async function updateInterviewSessionStatus(params: {
  interviewId: string;
  userId: string;
  videoUrl?: string | null;
  videoKey?: string | null;
  status?: InterviewStatus;
}) {
  const { interviewId, userId, videoUrl, videoKey, status } = params;

  return prisma.interviewSession.update({
    where: { id: interviewId, userId, deletedAt: null },
    data: {
      ...(videoUrl !== undefined ? { videoUrl } : {}),
      ...(videoKey !== undefined ? { videoKey } : {}),
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      videoUrl: true,
      videoKey: true,
      status: true,
    },
  });
}

export async function expireInterviewSessionIfStale(params: {
  interviewId: string;
  userId: string;
  cutoff: Date;
}): Promise<boolean> {
  const { interviewId, userId, cutoff } = params;
  const result = await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      status: "IN_PROGRESS",
      deletedAt: null,
      createdAt: { lte: cutoff },
    },
    data: { status: "COMPLETED" },
  });

  return result.count === 1;
}

export async function completeExpiredInterviewSessions(params: {
  cutoff: Date;
  limit: number;
}): Promise<number> {
  const { cutoff, limit } = params;
  const staleSessions = await prisma.interviewSession.findMany({
    where: {
      status: "IN_PROGRESS",
      deletedAt: null,
      createdAt: { lte: cutoff },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const ids = staleSessions.map((session) => session.id);
  if (ids.length === 0) return 0;

  const result = await prisma.interviewSession.updateMany({
    where: {
      id: { in: ids },
      status: "IN_PROGRESS",
      deletedAt: null,
      createdAt: { lte: cutoff },
    },
    data: { status: "COMPLETED" },
  });

  return result.count;
}

export async function advanceInterviewCurrentQuestion(params: {
  interviewId: string;
  userId: string;
  expectedCurrentQuestion: number;
}) {
  const { interviewId, userId, expectedCurrentQuestion } = params;

  const result = await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      deletedAt: null,
      status: "IN_PROGRESS",
      currentQuestion: expectedCurrentQuestion,
    },
    data: {
      currentQuestion: {
        increment: 1,
      },
    },
  });

  return result.count === 1;
}

export async function persistWhiteboardScene(params: {
  interviewId: string;
  userId: string;
  expectedCurrentQuestion: number;
  sessionPlan: Prisma.InputJsonValue;
}): Promise<boolean> {
  const { interviewId, userId, expectedCurrentQuestion, sessionPlan } = params;
  const result = await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      deletedAt: null,
      status: "IN_PROGRESS",
      currentQuestion: expectedCurrentQuestion,
    },
    data: { sessionPlan },
  });

  return result.count === 1;
}

export async function softDeleteInterviewSession(params: {
  interviewId: string;
  userId: string;
  deletedAt?: Date;
}): Promise<boolean> {
  const { interviewId, userId, deletedAt = new Date() } = params;
  const result = await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      deletedAt: null,
    },
    data: { deletedAt, shareToken: null },
  });

  return result.count === 1;
}
