import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAwsS3Env } from "@/lib/env";

export interface VideoRecording {
  key: string;
  url: string;
  lastModified: string;
  size: number;
}

const VIDEO_LIST_CACHE_TTL_MS = 10_000;

type VideoListCacheEntry = {
  expiresAtMs: number;
  value: VideoRecording[];
};

const videoListCache = new Map<string, VideoListCacheEntry>();

function isTestEnv() {
  return process.env.NODE_ENV === "test";
}

function readVideoListCache(prefix: string): VideoRecording[] | null {
  if (isTestEnv()) return null;

  const entry = videoListCache.get(prefix);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    videoListCache.delete(prefix);
    return null;
  }

  return entry.value;
}

function writeVideoListCache(prefix: string, value: VideoRecording[]) {
  if (isTestEnv()) return;
  videoListCache.set(prefix, {
    value,
    expiresAtMs: Date.now() + VIDEO_LIST_CACHE_TTL_MS,
  });
}

const s3Client = new S3Client({
  region: requireAwsS3Env().region,
  credentials: {
    accessKeyId: requireAwsS3Env().accessKeyId,
    secretAccessKey: requireAwsS3Env().secretAccessKey,
  },
});

const { bucketName } = requireAwsS3Env();

export async function listUserVideos(prefix: string): Promise<VideoRecording[]> {
  const cached = readVideoListCache(prefix);
  if (cached) {
    return cached;
  }

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  const listData = await s3Client.send(listCommand);

  if (!listData.Contents || listData.Contents.length === 0) {
    return [];
  }

  const sortedContents = listData.Contents.sort((a, b) => {
    return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
  });

  const videos = await Promise.all(
    sortedContents.map(async (item) => {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: item.Key!,
        ResponseContentDisposition: `attachment; filename="recording-${item.Key!.split("/").pop()}"`,
      });

      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      return {
        key: item.Key!,
        url,
        lastModified: item.LastModified?.toISOString() || new Date(0).toISOString(),
        size: item.Size || 0,
      };
    })
  );

  writeVideoListCache(prefix, videos);
  return videos;
}
