import { isAwsS3Configured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { deleteS3Object } from "@/lib/s3/videos";
import { logger } from "@/utils/logger";

export async function hardDeleteInterviewSessionById(interviewId: string): Promise<boolean> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: interviewId },
    select: { id: true, videoKey: true },
  });

  if (!session) {
    return false;
  }

  if (session.videoKey && isAwsS3Configured()) {
    try {
      await deleteS3Object(session.videoKey);
    } catch (error) {
      logger.error("Failed to remove S3 object during interview hard delete", {
        interviewId,
        videoKey: session.videoKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await prisma.interviewSession.delete({
    where: { id: interviewId },
  });

  return true;
}

export async function hardDeleteInterviewSessionForUser(params: {
  id: string;
  userId: string;
}): Promise<boolean> {
  const session = await prisma.interviewSession.findFirst({
    where: { id: params.id, userId: params.userId },
    select: { id: true },
  });

  if (!session) {
    return false;
  }

  return hardDeleteInterviewSessionById(session.id);
}
