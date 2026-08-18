import { S3Client } from "@aws-sdk/client-s3";
import { requireAwsS3Env } from "@/lib/env";

export type S3Runtime = {
  client: S3Client;
  bucketName: string;
};

let cachedRuntime: S3Runtime | null = null;

export function getS3Runtime(): S3Runtime {
  if (!cachedRuntime) {
    const aws = requireAwsS3Env();
    const client = new S3Client({
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    });
    cachedRuntime = { client, bucketName: aws.bucketName };
  }
  return cachedRuntime;
}

export function resetS3RuntimeForTesting(): void {
  cachedRuntime = null;
}
