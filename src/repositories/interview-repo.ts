import { randomBytes } from "crypto";
import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import type { Difficulty, InterviewPersona, InterviewType } from "@/lib/interview/domain";

const TYPE_FILTER_ALIASES: Record<InterviewType, string[]> = {
  "recruiter-screen": ["recruiter-screen"],
  "behavioral-leadership": ["behavioral-leadership", "behavioral", "leadership"],
  "coding-algorithms": ["coding-algorithms", "technical", "coding"],
  "system-design": ["system-design"],
  "domain-role": ["domain-role"],
  "take-home": ["take-home"],
  "hiring-manager": ["hiring-manager"],
  "bar-raiser": ["bar-raiser"],
};
import { prisma } from "@/lib/prisma";

const interviewSessionStateSelect = {
  id: true,
  status: true,
  videoUrl: true,
  videoKey: true,
  questionCount: true,
  currentQuestion: true,
  persona: true,
  type: true,
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

/**
 * Atomically owns an evaluation attempt without holding a database connection
 * while the model provider is running. A `null` result means a fresher owner
 * has already claimed the work.
 */
export async function claimInterviewEvaluation(params: {
  interviewId: string;
  userId: string;
  expectedClaimVersion: number;
  claimedAt: Date;
  staleBefore: Date;
}): Promise<number | null> {
  const { interviewId, userId, expectedClaimVersion, claimedAt, staleBefore } = params;
  const result = await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      evaluationClaimVersion: expectedClaimVersion,
      OR: [
        { evaluationStartedAt: null },
        { evaluationStartedAt: { lt: staleBefore } },
      ],
    },
    data: {
      evaluationStartedAt: claimedAt,
      evaluationClaimVersion: { increment: 1 },
    },
  });

  return result.count === 1 ? expectedClaimVersion + 1 : null;
}

/** Persists a model result only while this request still owns the claim. */
export async function persistClaimedEvaluation(params: {
  interviewId: string;
  userId: string;
  claimVersion: number;
  evaluation: Prisma.InputJsonValue;
}): Promise<boolean> {
  const { interviewId, userId, claimVersion, evaluation } = params;
  const result = await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      evaluationClaimVersion: claimVersion,
    },
    data: {
      evaluation,
      evaluationStartedAt: null,
    },
  });

  return result.count === 1;
}

/** Releases a failed claim only when it still belongs to this request. */
export async function releaseInterviewEvaluationClaim(params: {
  interviewId: string;
  userId: string;
  claimVersion: number;
}): Promise<void> {
  const { interviewId, userId, claimVersion } = params;
  await prisma.interviewSession.updateMany({
    where: {
      id: interviewId,
      userId,
      evaluationClaimVersion: claimVersion,
    },
    data: { evaluationStartedAt: null },
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

function mapCompletedSessionCard(s: {
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

export async function upsertQuestionFeedback(params: {
  interviewSessionId: string;
  questionOrder: number;
  rating: "up" | "down";
}): Promise<void> {
  await prisma.questionFeedback.upsert({
    where: {
      interviewSessionId_questionOrder: {
        interviewSessionId: params.interviewSessionId,
        questionOrder: params.questionOrder,
      },
    },
    create: {
      interviewSessionId: params.interviewSessionId,
      questionOrder: params.questionOrder,
      rating: params.rating,
    },
    update: { rating: params.rating },
  });
}

export async function getQuestionFeedbackForSession(interviewSessionId: string): Promise<
  Array<{ questionOrder: number; rating: string }>
> {
  return prisma.questionFeedback.findMany({
    where: { interviewSessionId },
    select: { questionOrder: true, rating: true },
    orderBy: { questionOrder: "asc" },
  });
}

export async function generateShareToken(params: {
  interviewId: string;
  userId: string;
}): Promise<string | null> {
  const token = randomBytes(16).toString("hex");
  const result = await prisma.interviewSession.updateMany({
    where: { id: params.interviewId, userId: params.userId, deletedAt: null, status: "COMPLETED" },
    data: { shareToken: token },
  });
  return result.count > 0 ? token : null;
}

export async function revokeShareToken(params: {
  interviewId: string;
  userId: string;
}): Promise<boolean> {
  const result = await prisma.interviewSession.updateMany({
    where: { id: params.interviewId, userId: params.userId, deletedAt: null },
    data: { shareToken: null },
  });
  return result.count > 0;
}

export async function getShareToken(params: {
  interviewId: string;
  userId: string;
}): Promise<string | null> {
  const session = await prisma.interviewSession.findFirst({
    where: { id: params.interviewId, userId: params.userId, deletedAt: null },
    select: { shareToken: true },
  });
  return session?.shareToken ?? null;
}

export type SharedInterviewView = {
  role: string;
  company: string | null;
  type: string;
  difficulty: string;
  evaluation: Record<string, unknown> | null;
  createdAt: Date;
};

export async function getSharedInterview(token: string): Promise<SharedInterviewView | null> {
  const session = await prisma.interviewSession.findUnique({
    where: { shareToken: token },
    select: {
      role: true,
      company: true,
      type: true,
      difficulty: true,
      evaluation: true,
      createdAt: true,
      deletedAt: true,
    },
  });
  if (!session || session.deletedAt) return null;
  return {
    role: session.role,
    company: session.company,
    type: session.type,
    difficulty: session.difficulty,
    evaluation: session.evaluation as Record<string, unknown> | null,
    createdAt: session.createdAt,
  };
}
