import type { PromptInterviewSession } from "@/lib/interview/domain";
import type { PrismaClient } from "@/generated/prisma/client";
import { writeRagTrace, type RagTraceRecord } from "@/lib/rag/trace";
import { logger } from "@/utils/logger";

export const PRIOR_QUESTION_LIMIT = 60;

export type RetrievalExecutionContext = {
  signal: AbortSignal;
  isActive(): boolean;
};

export type RetrievalSideEffects = {
  prisma: PrismaClient;
  questionCorpusIds: string[];
  trace: RagTraceRecord | null;
};

/**
 * Loads excluded question IDs that this candidate has already seen.
 */
export async function loadExcludedQuestionIds(
  session: PromptInterviewSession,
  prisma: PrismaClient
): Promise<string[]> {
  if (!session.id && !session.userId) {
    return [];
  }

  const rows: Array<{ questionCorpusId: string }> = await prisma.retrievedQuestion.findMany({
    where: session.userId
      ? {
          interviewSession: {
            userId: session.userId,
            role: session.role,
            deletedAt: null,
          },
        }
      : { interviewSessionId: session.id as string },
    select: { questionCorpusId: true },
    orderBy: { createdAt: "desc" },
    take: PRIOR_QUESTION_LIMIT,
  });

  return [...new Set(rows.map((row: { questionCorpusId: string }) => row.questionCorpusId))];
}

/**
 * Records used questions to avoid repeating in later turns.
 */
export async function recordRetrievedQuestions(
  session: PromptInterviewSession,
  prisma: PrismaClient,
  questionCorpusIds: string[],
  context: RetrievalExecutionContext
): Promise<void> {
  if (!context.isActive() || !session.id || questionCorpusIds.length === 0) {
    return;
  }

  try {
    if (!context.isActive()) return;
    await prisma.retrievedQuestion.createMany({
      data: questionCorpusIds.map((questionCorpusId) => ({
        interviewSessionId: session.id as string,
        questionCorpusId,
        questionOrder: session.currentQuestion,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    logger.warn("Failed to record retrieved questions", {
      interviewId: session.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function scheduleRetrievalSideEffects(
  session: PromptInterviewSession,
  context: RetrievalExecutionContext,
  sideEffects: RetrievalSideEffects | null
): void {
  if (!context.isActive() || !sideEffects) {
    return;
  }

  void (async () => {
    await recordRetrievedQuestions(
      session,
      sideEffects.prisma,
      sideEffects.questionCorpusIds,
      context
    );
    if (context.isActive() && sideEffects.trace) {
      await writeRagTrace(sideEffects.trace);
    }
  })().catch((error) => {
    logger.warn("Failed to complete retrieval side effects", {
      interviewId: session.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
