import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, internalServerError, unauthorizedError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  MULTIPART_UPLOAD_MAX_PARTS,
  MULTIPART_UPLOAD_SIGNED_URL_TTL_SECONDS,
} from "@/lib/s3/multipart-upload-constraints";
import { withCsrfProtection } from "@/lib/route-security";
import { parseJsonBody } from "@/lib/http/request-body";
import { getS3Runtime } from "@/lib/s3/runtime";
import { isAuthorizedMultipartIdentity, multipartIdentitySchema } from "@/lib/s3/multipart-request";
import { z } from "zod/v4";
import { logger } from "@/utils/logger";

const signPartLimiter = createRateLimiter("s3-multipart-sign-part", 60 * 60 * 1000, 120);

const signPartSchema = multipartIdentitySchema.extend({
  partNumber: z.number().int().min(1).max(MULTIPART_UPLOAD_MAX_PARTS),
});

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const parsed = await parseJsonBody(req, signPartSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const { interviewId, key, uploadId, uploadToken, partNumber } = parsed.data;

    if (
      !isAuthorizedMultipartIdentity({
        userId: authUser.userId,
        interviewId,
        key,
        uploadId,
        uploadToken,
      })
    ) {
      return apiError("Unauthorized to sign part for this key", 403);
    }

    if (await signPartLimiter.isLimited(`${authUser.userId}:${interviewId}:${uploadId}`)) {
      return apiError("Too many upload part requests. Please try again later.", 429);
    }

    const { client, bucketName } = getS3Runtime();

    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(client, command, {
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
