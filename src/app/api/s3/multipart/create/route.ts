import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { createMultipartUploadToken } from "@/lib/s3/multipart-upload-token";
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

const createSchema = z.object({
  interviewId: interviewIdSchema,
});

const createLimiter = createRateLimiter("s3-multipart-create", 10 * 60 * 1000, 20);

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    if (await createLimiter.isLimited(authUser.userId)) {
      return apiError("Too many upload requests. Please try again later.", 429);
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const { interviewId } = parsed.data;

    // Verify ownership
    const interviewSession = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId: authUser.userId },
      select: { id: true, videoKey: true },
    });

    if (!interviewSession) return apiError("Interview session not found", 403);
    if (interviewSession.videoKey) return apiError("Recording already exists for this interview session.", 409);

    const key = `${authUser.userId}/interview-${interviewId}.webm`;

    const command = new CreateMultipartUploadCommand({
      Bucket: aws.bucketName,
      Key: key,
      ContentType: "video/webm",
    });

    const response = await s3Client.send(command);

    if (!response.UploadId) throw new Error("AWS did not return an UploadId");

    const uploadToken = createMultipartUploadToken({
      userId: authUser.userId,
      interviewId,
      key,
      uploadId: response.UploadId,
    });

    return apiJson({ uploadId: response.UploadId, key, uploadToken });
  } catch (error) {
    logger.error("Error creating multipart upload", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/s3/multipart/create",
    });
    return internalServerError("Failed to create multipart upload");
  }
});
