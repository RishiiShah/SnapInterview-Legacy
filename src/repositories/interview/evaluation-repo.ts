import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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
      deletedAt: null,
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
      deletedAt: null,
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
      deletedAt: null,
      evaluationClaimVersion: claimVersion,
    },
    data: { evaluationStartedAt: null },
  });
}
