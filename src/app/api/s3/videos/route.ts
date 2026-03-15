import { csrfRejectIfInvalid } from "@/lib/csrf";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  apiJson,
  badRequestError,
  internalServerError,
  unauthorizedError,
} from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { listUserVideos, getSignedVideoUrl } from "@/lib/s3/videos";
import { S3Client } from "@aws-sdk/client-s3";
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

const deleteVideoSchema = z.object({
  key: z.string().min(1, "Missing key"),
});

const signVideoSchema = z.object({
  key: z.string().min(1, "Missing key"),
});

export async function GET(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const continuationToken = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const prefix = `${authUser.userId}/`;
    const result = await listUserVideos(prefix, { 
      maxKeys: limit, 
      continuationToken 
    });

    return apiJson(result);
  } catch (error) {
    logger.error("S3 list videos error", {
      error: error instanceof Error ? error.message : String(error),
      route: "GET /api/s3/videos",
    });
    return internalServerError("Failed to fetch videos");
  }
}

/**
 * Endpoint to get a signed URL for a specific video on-demand.
 */
export async function POST(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = signVideoSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestError("Invalid request body");
    }

    const { key } = parsed.data;

    if (!key.startsWith(`${authUser.userId}/`)) {
      return apiError("Unauthorized access to key", 403);
    }

    const url = await getSignedVideoUrl(key);
    return apiJson({ url });
  } catch (error) {
    logger.error("S3 sign video URL error", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/s3/videos",
    });
    return internalServerError("Failed to sign video URL");
  }
}

export async function DELETE(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = deleteVideoSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return badRequestError(firstError);
    }

    const { key } = parsed.data;

    // Ensure user can only delete their own videos
    if (!key.startsWith(`${authUser.userId}/`)) {
      return apiError("Unauthorized access to key", 403);
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: aws.bucketName,
      Key: key,
    });

    await s3Client.send(deleteCommand);

    await prisma.interviewSession.updateMany({
      where: {
        userId: authUser.userId,
        videoKey: key,
      },
      data: {
        videoKey: null,
        videoUrl: null,
      },
    });

    return apiJson({ success: true });
  } catch (error) {
    logger.error("S3 delete video error", {
      error: error instanceof Error ? error.message : String(error),
      route: "DELETE /api/s3/videos",
    });
    return internalServerError("Failed to delete video");
  }
}
