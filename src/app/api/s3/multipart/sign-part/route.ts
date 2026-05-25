import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { withCsrfProtection } from "@/lib/route-security";
import { z } from "zod/v4";
import { logger } from "@/utils/logger";

const aws = requireAwsS3Env();

const s3Client = new S3Client({
  region: aws.region,
  credentials: {
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
  },
});

const signPartSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  partNumber: z.number().int().min(1).max(10000),
});

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const body = await req.json();
    const parsed = signPartSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const { key, uploadId, partNumber } = parsed.data;

    // Security check to ensure users can only upload parts to their own keys
    if (!key.startsWith(`${authUser.userId}/`)) {
      return apiError("Unauthorized to sign part for this key", 403);
    }

    const command = new UploadPartCommand({
      Bucket: aws.bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return apiJson({ url });
  } catch (error) {
    logger.error("Error generating presigned URL for part", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/s3/multipart/sign-part",
    });
    return internalServerError("Failed to sign part");
  }
});
