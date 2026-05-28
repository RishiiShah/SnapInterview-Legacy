import { prisma } from "@/lib/prisma";
import { isAwsS3Configured } from "@/lib/env";
import { listUserVideos, type VideoRecording } from "@/lib/s3/videos";

export async function findOrphanedRecordingsForUser(userId: string): Promise<VideoRecording[]> {
  if (!isAwsS3Configured()) {
    return [];
  }

  const linkedKeys = await prisma.interviewSession.findMany({
    where: { userId, videoKey: { not: null } },
    select: { videoKey: true },
  });

  const linkedSet = new Set(
    linkedKeys.map((row) => row.videoKey).filter((key): key is string => Boolean(key)),
  );

  const { videos } = await listUserVideos(`${userId}/`, { maxKeys: 200 });
  return videos.filter((video) => !linkedSet.has(video.key));
}
