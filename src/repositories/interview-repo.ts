import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const interviewSessionStateSelect = {
  id: true,
  status: true,
  questionCount: true,
  currentQuestion: true,
} satisfies Prisma.InterviewSessionSelect;

const interviewSessionChatSelect = {
  id: true,
  role: true,
  company: true,
  type: true,
  difficulty: true,
  jobDescription: true,
  resumeUrl: true,
  questionCount: true,
  currentQuestion: true,
} satisfies Prisma.InterviewSessionSelect;

const interviewSessionEvaluationSelect = {
  id: true,
  role: true,
  company: true,
  type: true,
  difficulty: true,
  jobDescription: true,
  resumeUrl: true,
  questionCount: true,
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

type InterviewSessionState = Prisma.InterviewSessionGetPayload<{
  select: typeof interviewSessionStateSelect;
}>;

type InterviewSessionChat = Prisma.InterviewSessionGetPayload<{
  select: typeof interviewSessionChatSelect;
}>;

type InterviewSessionEvaluation = Prisma.InterviewSessionGetPayload<{
  select: typeof interviewSessionEvaluationSelect;
}>;

type InterviewSessionView = "state" | "chat" | "evaluation";

type InterviewSessionByView<TView extends InterviewSessionView> =
  TView extends "state"
    ? InterviewSessionState
    : TView extends "chat"
      ? InterviewSessionChat
      : InterviewSessionEvaluation;

export async function getInterviewSession<TView extends InterviewSessionView>(params: {
  interviewId: string;
  userId: string;
  view: TView;
}): Promise<InterviewSessionByView<TView> | null> {
  const { interviewId, userId, view } = params;

  if (view === "state") {
    const session = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
      select: interviewSessionStateSelect,
    });
    return session as InterviewSessionByView<TView> | null;
  }

  if (view === "chat") {
    const session = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
      select: interviewSessionChatSelect,
    });
    return session as InterviewSessionByView<TView> | null;
  }

  const session = await prisma.interviewSession.findFirst({
    where: { id: interviewId, userId },
    select: interviewSessionEvaluationSelect,
  });

  return session as InterviewSessionByView<TView> | null;
}

export async function createInterviewSession(params: {
  userId: string;
  role: string;
  company?: string | null;
  type: string;
  difficulty: string;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  questionCount?: number;
}) {
  const { userId, role, company, type, difficulty, jobDescription, resumeUrl, questionCount } = params;

  return prisma.interviewSession.create({
    data: {
      userId,
      role,
      company: company ?? null,
      type,
      difficulty,
      jobDescription: jobDescription ?? null,
      resumeUrl: resumeUrl ?? null,
      questionCount: questionCount ?? 10,
    },
    select: {
      id: true,
    },
  });
}

export async function updateInterviewSessionStatus(params: {
  interviewId: string;
  videoUrl?: string | null;
  status?: InterviewStatus;
}) {
  const { interviewId, videoUrl, status } = params;

  return prisma.interviewSession.update({
    where: { id: interviewId },
    data: {
      videoUrl: videoUrl ?? null,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      videoUrl: true,
    },
  });
}

export async function updateEvaluation(params: {
  interviewId: string;
  evaluation: Prisma.InputJsonValue;
}) {
  const { interviewId, evaluation } = params;

  return prisma.interviewSession.update({
    where: { id: interviewId },
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
