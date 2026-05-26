import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  apiJson,
  badRequestError,
  internalServerError,
  notFoundError,
  unauthorizedError,
} from "@/lib/api-response";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireAwsS3Env } from "@/lib/env";
import { listUserVideos, getSignedVideoUrl } from "@/lib/s3/videos";
import { S3Client } from "@aws-sdk/client-s3";
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

const deleteVideoSchema = z.object({
  key: z.string().min(1, "Missing key"),
  deleteInterviewData: z.boolean().optional().default(false),
});

const signVideoSchema = z.object({
  key: z.string().min(1, "Missing key"),
});

const DEFAULT_VIDEO_LIST_LIMIT = 12;
const MAX_VIDEO_LIST_LIMIT = 48;
const listVideosLimiter = createRateLimiter("s3-videos-list", 60 * 1000, 60);
const signVideoLimiter = createRateLimiter("s3-videos-sign", 60 * 1000, 60);
const deleteVideoLimiter = createRateLimiter("s3-videos-delete", 60 * 1000, 30);

function parseListLimit(value: string | null) {
  const parsed = Number.parseInt(value || String(DEFAULT_VIDEO_LIST_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_VIDEO_LIST_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_VIDEO_LIST_LIMIT);
}

async function findOwnedVideoSession(userId: string, key: string) {
  return prisma.interviewSession.findFirst({
    where: {
      userId,
      videoKey: key,
    },
    select: { id: true },
  });
}

export async function GET(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    if (await listVideosLimiter.isLimited(authUser.userId)) {
      return apiError("Too many video list requests. Please try again later.", 429);
    }

    const { searchParams } = new URL(req.url);
    const continuationToken = searchParams.get("cursor") || undefined;
    const limit = parseListLimit(searchParams.get("limit"));

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
export const POST = withCsrfProtection(async (req: Request) => {
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

    if (await signVideoLimiter.isLimited(authUser.userId)) {
      return apiError("Too many video signing requests. Please try again later.", 429);
    }

    const session = await findOwnedVideoSession(authUser.userId, key);
    if (!session) {
      return notFoundError("Video not found");
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
});

export const DELETE = withCsrfProtection(async (req: Request) => {
  try {
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

    const { key, deleteInterviewData } = parsed.data;

    // Ensure user can only delete their own videos
    if (!key.startsWith(`${authUser.userId}/`)) {
      return apiError("Unauthorized access to key", 403);
    }

    if (await deleteVideoLimiter.isLimited(authUser.userId)) {
      return apiError("Too many video delete requests. Please try again later.", 429);
    }

    const session = await findOwnedVideoSession(authUser.userId, key);
    if (!session) {
      return notFoundError("Video not found");
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: aws.bucketName,
      Key: key,
    });

    await s3Client.send(deleteCommand);

    if (deleteInterviewData) {
      await prisma.interviewSession.deleteMany({
        where: {
          userId: authUser.userId,
          videoKey: key,
        },
      });
    } else {
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
    }

    invalidateInterviewMetricsCache(authUser.userId);

    return apiJson({ success: true });
  } catch (error) {
    logger.error("S3 delete video error", {
      error: error instanceof Error ? error.message : String(error),
      route: "DELETE /api/s3/videos",
    });
    return internalServerError("Failed to delete video");
  }
});
