import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const interviewSessionStateSelect = {
  id: true,
  status: true,
  videoUrl: true,
  questionCount: true,
  currentQuestion: true,
} satisfies Prisma.InterviewSessionSelect;

const interviewSessionChatSelect = {
  id: true,
  role: true,
  company: true,
  type: true,
  difficulty: true,
  persona: true,
  jobDescription: true,
  resumeUrl: true,
  questionCount: true,
  currentQuestion: true,
  focusAreas: true,
  sessionPlan: true,
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

const interviewSessionEvaluationSelect = {
  id: true,
  role: true,
  company: true,
  type: true,
  difficulty: true,
  persona: true,
  jobDescription: true,
  resumeUrl: true,
  questionCount: true,
  currentQuestion: true,
  focusAreas: true,
  sessionPlan: true,
  evaluation: true,
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

const interviewSessionSelectByView = {
  state: interviewSessionStateSelect,
  chat: interviewSessionChatSelect,
  evaluation: interviewSessionEvaluationSelect,
} as const;

type InterviewSessionView = keyof typeof interviewSessionSelectByView;

type InterviewSessionByView = {
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
    where: { id: interviewId, userId },
    select: interviewSessionSelectByView[view],
  });

  return session as InterviewSessionByView[TView] | null;
}

export async function createInterviewSession(params: {
  userId: string;
  role: string;
  company?: string | null;
  type: string;
  difficulty: string;
  persona?: string;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  questionCount?: number;
  focusAreas?: Prisma.InputJsonValue;
  sessionPlan?: Prisma.InputJsonValue;
}) {
  const {
    userId,
    role,
    company,
    type,
    difficulty,
    persona,
    jobDescription,
    resumeUrl,
    questionCount,
    focusAreas,
    sessionPlan,
  } = params;

  return prisma.interviewSession.create({
    data: {
      userId,
      role,
      company: company ?? null,
      type,
      difficulty,
      persona: persona ?? null,
      jobDescription: jobDescription ?? null,
      resumeUrl: resumeUrl ?? null,
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
  status?: InterviewStatus;
}) {
  const { interviewId, userId, videoUrl, status } = params;

  return prisma.interviewSession.update({
    where: { id: interviewId, userId },
    data: {
      videoUrl: videoUrl ?? null,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      videoUrl: true,
      status: true,
    },
  });
}

export async function updateEvaluation(params: {
  interviewId: string;
  userId: string;
  evaluation: Prisma.InputJsonValue;
}) {
  const { interviewId, userId, evaluation } = params;

  return prisma.interviewSession.update({
    where: { id: interviewId, userId },
    data: { evaluation },
    select: {
      id: true,
    },
  });
}

export async function incrementCurrentQuestion(interviewId: string) {
  return prisma.interviewSession.update({
    where: { id: interviewId },
    data: { currentQuestion: { increment: 1 } },
    select: { id: true },
  });
}
