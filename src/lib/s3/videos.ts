import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAwsS3Env } from "@/lib/env";

type S3ListItem = {
  Key?: string;
  LastModified?: Date;
  Size?: number;
};

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

function isPlayableRecordingObject(item: S3ListItem): item is Required<Pick<S3ListItem, "Key">> & S3ListItem {
  return Boolean(item.Key && item.Key.endsWith(".webm") && (item.Size ?? 0) > 0);
}

export function normalizeListedVideoObjects(contents: S3ListItem[]): VideoRecording[] {
  return contents
    .filter(isPlayableRecordingObject)
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
    .map((item) => ({
      key: item.Key,
      lastModified: item.LastModified?.toISOString() || new Date(0).toISOString(),
      size: item.Size || 0,
    }));
}

let s3Client: S3Client | null = null;

function getS3Runtime() {
  const aws = requireAwsS3Env();
  if (!s3Client) {
    s3Client = new S3Client({
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    });
  }
  return { client: s3Client, bucketName: aws.bucketName };
}

/**
 * Lists user videos with pagination support.
 * Does NOT sign URLs by default to improve performance and scalability.
 */
export async function listUserVideos(
  prefix: string,
  options: { maxKeys?: number; continuationToken?: string } = {}
): Promise<PaginatedVideos> {
  const { maxKeys = 12, continuationToken } = options;

  const { client, bucketName } = getS3Runtime();
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
    MaxKeys: maxKeys,
    ContinuationToken: continuationToken,
  });

  const listData = await client.send(listCommand);

  if (!listData.Contents || listData.Contents.length === 0) {
    return { videos: [] };
  }

  const videos = normalizeListedVideoObjects(listData.Contents);

  return {
    videos,
    nextContinuationToken: listData.NextContinuationToken,
  };
}

/**
 * Generates a signed URL for a specific video key.
 */
export async function getSignedVideoUrl(key: string, expiresIn = 3600): Promise<string> {
  const { client, bucketName } = getS3Runtime();
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="recording-${key.split("/").pop()}"`,
  });

  return getSignedUrl(client, getCommand, { expiresIn });
}

function isS3NotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const status =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object" &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : undefined;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}

export async function s3ObjectExists(key: string): Promise<boolean> {
  const { client, bucketName } = getS3Runtime();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    if (isS3NotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

/** Head-check unique keys in parallel (one S3 call per distinct key). */
export async function batchS3ObjectExists(keys: string[]): Promise<Map<string, boolean>> {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  const results = new Map<string, boolean>();

  await Promise.all(
    uniqueKeys.map(async (key) => {
      results.set(key, await s3ObjectExists(key));
    }),
  );

  return results;
}

export async function deleteS3Object(key: string): Promise<void> {
  const { client, bucketName } = getS3Runtime();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}
