import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAwsS3Env } from "@/lib/env";

export interface VideoRecording {
  key: string;
  url?: string; // Optional because we might only sign on demand
  lastModified: string;
  size: number;
}

export interface PaginatedVideos {
  videos: VideoRecording[];
  nextContinuationToken?: string;
}

const s3Client = new S3Client({
  region: requireAwsS3Env().region,
  credentials: {
    accessKeyId: requireAwsS3Env().accessKeyId,
    secretAccessKey: requireAwsS3Env().secretAccessKey,
  },
});

const { bucketName } = requireAwsS3Env();

/**
 * Lists user videos with pagination support.
 * Does NOT sign URLs by default to improve performance and scalability.
 */
export async function listUserVideos(
  prefix: string,
  options: { maxKeys?: number; continuationToken?: string } = {}
): Promise<PaginatedVideos> {
  const { maxKeys = 12, continuationToken } = options;

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
    MaxKeys: maxKeys,
    ContinuationToken: continuationToken,
  });

  const listData = await s3Client.send(listCommand);

  if (!listData.Contents || listData.Contents.length === 0) {
    return { videos: [] };
  }

  // S3 doesn't guarantee global sort by date in ListObjectsV2, 
  // but for a single user prefix, it's often sufficient.
  // We sort locally just in case.
  const sortedContents = listData.Contents.sort((a, b) => {
    return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
  });

  const videos: VideoRecording[] = sortedContents.map((item) => ({
    key: item.Key!,
    lastModified: item.LastModified?.toISOString() || new Date(0).toISOString(),
    size: item.Size || 0,
  }));

  return {
    videos,
    nextContinuationToken: listData.NextContinuationToken,
  };
}

/**
 * Generates a signed URL for a specific video key.
 */
export async function getSignedVideoUrl(key: string, expiresIn = 3600): Promise<string> {
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="recording-${key.split("/").pop()}"`,
  });

  return getSignedUrl(s3Client, getCommand, { expiresIn });
}
