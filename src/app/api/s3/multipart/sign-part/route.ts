import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  MULTIPART_UPLOAD_MAX_PARTS,
  MULTIPART_UPLOAD_SIGNED_URL_TTL_SECONDS,
} from "@/lib/s3/multipart-upload-constraints";
import { withCsrfProtection } from "@/lib/route-security";
import { verifyMultipartUploadToken } from "@/lib/s3/multipart-upload-token";
import { interviewIdSchema } from "@/lib/interview/domain";
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

const signPartLimiter = createRateLimiter("s3-multipart-sign-part", 60 * 60 * 1000, 120);

const signPartSchema = z.object({
  interviewId: interviewIdSchema,
  key: z.string().min(1),
  uploadId: z.string().min(1),
  uploadToken: z.string().min(1),
  partNumber: z.number().int().min(1).max(MULTIPART_UPLOAD_MAX_PARTS),
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

    const { interviewId, key, uploadId, uploadToken, partNumber } = parsed.data;
    const expectedKey = `${authUser.userId}/interview-${interviewId}.webm`;

    if (
      key !== expectedKey ||
      !verifyMultipartUploadToken(uploadToken, {
        userId: authUser.userId,
        interviewId,
        key,
        uploadId,
      })
    ) {
      return apiError("Unauthorized to sign part for this key", 403);
    }

    if (await signPartLimiter.isLimited(`${authUser.userId}:${interviewId}:${uploadId}`)) {
      return apiError("Too many upload part requests. Please try again later.", 429);
    }

    const command = new UploadPartCommand({
      Bucket: aws.bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: MULTIPART_UPLOAD_SIGNED_URL_TTL_SECONDS,
    });

    return apiJson({ url });
  } catch (error) {
    logger.error("Error generating presigned URL for part", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/s3/multipart/sign-part",
    });
    return internalServerError("Failed to sign part");
  }
});
