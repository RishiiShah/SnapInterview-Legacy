import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import type { Difficulty, InterviewPersona, InterviewType } from "@/lib/interview/domain";
import { prisma } from "@/lib/prisma";

const interviewSessionStateSelect = {
  id: true,
  status: true,
  videoUrl: true,
  videoKey: true,
  questionCount: true,
  currentQuestion: true,
  persona: true,
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
  resumeText: true,
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
  resumeText: true,
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
    where: { id: interviewId, userId },
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

export async function deleteInterviewSession(params: {
  interviewId: string;
  userId: string;
}) {
  const { interviewId, userId } = params;
  return prisma.interviewSession.deleteMany({
    where: {
      id: interviewId,
      userId,
      status: "IN_PROGRESS",
    },
  });
}
