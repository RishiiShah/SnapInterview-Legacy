import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import {
  MULTIPART_UPLOAD_MAX_BYTES,
  MULTIPART_UPLOAD_MAX_PARTS,
} from "@/lib/s3/multipart-upload-constraints";
import { createMultipartCompletionToken } from "@/lib/s3/multipart-upload-token";
import { parseJsonBody } from "@/lib/http/request-body";
import { getS3Runtime } from "@/lib/s3/runtime";
import { isAuthorizedMultipartIdentity, multipartIdentitySchema } from "@/lib/s3/multipart-request";
import { z } from "zod/v4";
import { logger } from "@/utils/logger";

const completeLimiter = createRateLimiter("s3-multipart-complete", 60 * 60 * 1000, 20);

type UploadedPart = {
  PartNumber?: number;
  ETag?: string;
  Size?: number;
};

const completeSchema = multipartIdentitySchema.extend({
  parts: z.array(z.object({
    PartNumber: z.number().int().min(1).max(MULTIPART_UPLOAD_MAX_PARTS),
    ETag: z.string().min(1),
  })).max(MULTIPART_UPLOAD_MAX_PARTS).optional().default([]),
  action: z.enum(["complete", "abort"]).optional().default("complete"),
});

function normalizeETag(etag: string) {
  return etag.replace(/^"|"$/g, "");
}

async function abortMultipartUpload(key: string, uploadId: string) {
  const { client, bucketName } = getS3Runtime();
  const command = new AbortMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
  });
  await client.send(command);
}

async function listUploadedParts(key: string, uploadId: string) {
  const { client, bucketName } = getS3Runtime();
  const uploadedParts: UploadedPart[] = [];
  let partNumberMarker: string | undefined;
  let isTruncated = true;
  let isTruncatedLoop = true;

  while (isTruncatedLoop) {
    const response = await client.send(new ListPartsCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumberMarker: partNumberMarker,
      MaxParts: MULTIPART_UPLOAD_MAX_PARTS,
    }));

    uploadedParts.push(...(response.Parts ?? []));
    isTruncated = Boolean(response.IsTruncated);
    isTruncatedLoop = isTruncated;
    partNumberMarker = response.NextPartNumberMarker;
  }

  return uploadedParts;
}

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const parsed = await parseJsonBody(req, completeSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const { interviewId, key, uploadId, uploadToken, parts, action } = parsed.data;

    if (
      !isAuthorizedMultipartIdentity({
        userId: authUser.userId,
        interviewId,
        key,
        uploadId,
        uploadToken,
      })
    ) {
      return apiError("Unauthorized to complete multipart upload for this key", 403);
    }

    if (await completeLimiter.isLimited(`${authUser.userId}:${interviewId}:${uploadId}`)) {
      return apiError("Too many upload completion requests. Please try again later.", 429);
    }

    if (action === "abort") {
      await abortMultipartUpload(key, uploadId);
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

    const uploadedParts = await listUploadedParts(key, uploadId);
    const uploadedPartByNumber = new Map(
      uploadedParts
        .filter((part): part is UploadedPart & { PartNumber: number; ETag: string; Size: number } =>
          typeof part.PartNumber === "number" &&
          typeof part.ETag === "string" &&
          typeof part.Size === "number"
        )
        .map(part => [part.PartNumber, part])
    );

    const partsMatchS3 =
      uploadedPartByNumber.size === uploadedParts.length &&
      uploadedParts.length === parts.length &&
      parts.every((part) => {
        const uploadedPart = uploadedPartByNumber.get(part.PartNumber);
        return uploadedPart && normalizeETag(uploadedPart.ETag) === normalizeETag(part.ETag);
      });

    if (!partsMatchS3) {
      await abortMultipartUpload(key, uploadId);
      return badRequestError("Uploaded parts do not match submitted completion parts");
    }

    const uploadedSizeBytes = uploadedParts.reduce((total, part) => total + (part.Size ?? 0), 0);
    if (uploadedSizeBytes > MULTIPART_UPLOAD_MAX_BYTES) {
      await abortMultipartUpload(key, uploadId);
      return badRequestError("Upload exceeds the maximum allowed size");
    }

    const { client, bucketName } = getS3Runtime();

    // Process Complete
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        // AWS expects exactly { ETag, PartNumber }
        Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: p.PartNumber })),
      },
    });

    await client.send(command);

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
