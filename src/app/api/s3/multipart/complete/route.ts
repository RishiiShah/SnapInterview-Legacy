import { S3Client, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
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

const completeSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(z.object({
    PartNumber: z.number().int().min(1).max(10000),
    ETag: z.string().min(1),
  })).min(1),
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

    const { key, uploadId, parts, action } = parsed.data;

    // Security check
    if (!key.startsWith(`${authUser.userId}/`)) {
      return apiError("Unauthorized to complete multipart upload for this key", 403);
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

    return apiJson({ success: true, key });
  } catch (error) {
    logger.error("Error completing multipart upload", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/s3/multipart/complete",
    });
    return internalServerError("Failed to complete multipart upload");
  }
});
