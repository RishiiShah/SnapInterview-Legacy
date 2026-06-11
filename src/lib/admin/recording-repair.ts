import { isAwsS3Configured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { s3ObjectExists } from "@/lib/s3/videos";

export type LegacyRecordingRepairResult =
  | { status: "repaired"; videoKey: string }
  | { status: "already_repaired"; videoKey: string }
  | { status: "already_linked"; videoKey: string }
  | { status: "missing_object"; videoKey: string }
  | { status: "not_found" }
  | {
      status: "not_repairable";
      reason:
        | "missing_video_url"
        | "invalid_video_url"
        | "unsupported_file_type"
        | "outside_user_prefix";
    };

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002",
  );
}

function normalizeS3KeyFromUrl(videoUrl: string, userId: string): string | null {
  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return null;
  }

  const segments = url.pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean);
  const userSegmentIndex = segments.indexOf(userId);
  const keySegments = userSegmentIndex >= 0 ? segments.slice(userSegmentIndex) : segments;
  const key = keySegments.join("/");

  return key || null;
}

function validateDerivedVideoKey(videoKey: string | null, userId: string) {
  if (!videoKey) {
    return { ok: false as const, reason: "invalid_video_url" as const };
  }

  if (!videoKey.toLowerCase().endsWith(".webm")) {
    return { ok: false as const, reason: "unsupported_file_type" as const };
  }

  if (!videoKey.startsWith(`${userId}/`)) {
    return { ok: false as const, reason: "outside_user_prefix" as const };
  }

  return { ok: true as const, videoKey };
}

export async function repairLegacyRecordingMetadata(params: {
  interviewId: string;
}): Promise<LegacyRecordingRepairResult> {
  const interview = await prisma.interviewSession.findUnique({
    where: { id: params.interviewId },
    select: {
      id: true,
      userId: true,
      videoUrl: true,
      videoKey: true,
    },
  });

  if (!interview) {
    return { status: "not_found" };
  }

  if (interview.videoKey) {
    return { status: "already_repaired", videoKey: interview.videoKey };
  }

  if (!interview.videoUrl) {
    return { status: "not_repairable", reason: "missing_video_url" };
  }

  const validation = validateDerivedVideoKey(
    normalizeS3KeyFromUrl(interview.videoUrl, interview.userId),
    interview.userId,
  );
  if (!validation.ok) {
    return { status: "not_repairable", reason: validation.reason };
  }

  if (isAwsS3Configured() && !(await s3ObjectExists(validation.videoKey))) {
    return { status: "missing_object", videoKey: validation.videoKey };
  }

  try {
    const update = await prisma.interviewSession.updateMany({
      where: {
        id: interview.id,
        videoKey: null,
        videoUrl: { not: null },
      },
      data: { videoKey: validation.videoKey },
    });

    return update.count > 0
      ? { status: "repaired", videoKey: validation.videoKey }
      : { status: "already_linked", videoKey: validation.videoKey };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "already_linked", videoKey: validation.videoKey };
    }

    throw error;
  }
}
