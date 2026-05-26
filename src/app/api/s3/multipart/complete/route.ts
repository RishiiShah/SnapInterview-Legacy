import { S3Client, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { MULTIPART_UPLOAD_MAX_PARTS } from "@/lib/s3/multipart-upload-constraints";
import { createMultipartCompletionToken, verifyMultipartUploadToken } from "@/lib/s3/multipart-upload-token";
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

const completeLimiter = createRateLimiter("s3-multipart-complete", 60 * 60 * 1000, 20);

const completeSchema = z.object({
  interviewId: z.string().uuid("interviewId must be a valid UUID"),
  key: z.string().min(1),
  uploadId: z.string().min(1),
  uploadToken: z.string().min(1),
  parts: z.array(z.object({
    PartNumber: z.number().int().min(1).max(MULTIPART_UPLOAD_MAX_PARTS),
    ETag: z.string().min(1),
  })).max(MULTIPART_UPLOAD_MAX_PARTS).optional().default([]),
  action: z.enum(["complete", "abort"]).optional().default("complete"),
});

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const body = await req.json();
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const { interviewId, key, uploadId, uploadToken, parts, action } = parsed.data;
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
      return apiError("Unauthorized to complete multipart upload for this key", 403);
    }

    if (await completeLimiter.isLimited(`${authUser.userId}:${interviewId}:${uploadId}`)) {
      return apiError("Too many upload completion requests. Please try again later.", 429);
    }

    if (action === "abort") {
      const command = new AbortMultipartUploadCommand({
        Bucket: aws.bucketName,
        Key: key,
        UploadId: uploadId,
      });
      await s3Client.send(command);
      return apiJson({ success: true, action: "aborted" });
    }

    if (parts.length === 0) {
      return badRequestError("At least one upload part is required");
    }

    const hasSequentialParts = parts.every(
      (part, index) => part.PartNumber === index + 1
    );
    if (!hasSequentialParts) {
      return badRequestError("Upload parts must be sequential and ordered");
    }

    // Process Complete
    const command = new CompleteMultipartUploadCommand({
      Bucket: aws.bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        // AWS expects exactly { ETag, PartNumber }
        Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: p.PartNumber })),
      },
    });

    await s3Client.send(command);

    const videoCompletionToken = createMultipartCompletionToken({
      userId: authUser.userId,
      interviewId,
      key,
      uploadId,
    });

    return apiJson({ success: true, key, videoCompletionToken });
  } catch (error) {
    logger.error("Error completing multipart upload", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/s3/multipart/complete",
    });
    return internalServerError("Failed to complete multipart upload");
  }
});
