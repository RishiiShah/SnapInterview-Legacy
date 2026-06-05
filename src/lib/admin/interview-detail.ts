import { normalizeTranscriptEvaluation } from "@/lib/interview/evaluation";
import { resolveRecordingIntegrity } from "@/lib/admin/recording-integrity";
import { isAwsS3Configured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSignedVideoUrl } from "@/lib/s3/videos";

export async function getAdminInterviewDetail(interviewId: string) {
  const interview = await prisma.interviewSession.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      role: true,
      company: true,
      type: true,
      difficulty: true,
      persona: true,
      status: true,
      questionCount: true,
      currentQuestion: true,
      videoUrl: true,
      videoKey: true,
      evaluation: true,
      focusAreas: true,
      sessionPlan: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      transcript: {
        select: {
          id: true,
          order: true,
          question: true,
          answer: true,
          createdAt: true,
        },
        orderBy: { order: "asc" },
      },
      questionFeedback: {
        select: {
          id: true,
          questionOrder: true,
          rating: true,
          createdAt: true,
        },
        orderBy: { questionOrder: "asc" },
      },
      moderationNotes: {
        select: {
          id: true,
          authorEmail: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!interview) {
    return null;
  }

  const recordingIntegrity = await resolveRecordingIntegrity({
    videoKey: interview.videoKey,
    videoUrl: interview.videoUrl,
  });

  let signedPlaybackUrl: string | null = null;
  if (interview.videoKey && isAwsS3Configured() && recordingIntegrity.s3Exists) {
    try {
      signedPlaybackUrl = await getSignedVideoUrl(interview.videoKey);
    } catch {
      signedPlaybackUrl = null;
    }
  }

  return {
    ...interview,
    evaluationNormalized: normalizeTranscriptEvaluation(interview.evaluation),
    recordingIntegrity,
    signedPlaybackUrl,
    createdAtIso: interview.createdAt.toISOString(),
    transcript: interview.transcript.map((entry) => ({
      ...entry,
      createdAtIso: entry.createdAt.toISOString(),
    })),
    questionFeedback: interview.questionFeedback.map((entry) => ({
      ...entry,
      createdAtIso: entry.createdAt.toISOString(),
    })),
    moderationNotes: interview.moderationNotes.map((entry) => ({
      ...entry,
      createdAtIso: entry.createdAt.toISOString(),
    })),
  };
}

export type AdminInterviewDetail = NonNullable<Awaited<ReturnType<typeof getAdminInterviewDetail>>>;
