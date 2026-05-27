import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAwsS3Env } from "@/lib/env";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const SUPPORTED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const aws = requireAwsS3Env();
const s3Client = new S3Client({
  region: aws.region,
  credentials: {
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
  },
});

function extensionForType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function extractAvatarKeyFromPath(image: string | null) {
  if (!image) return null;
  const match = image.match(/^\/api\/avatar\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const formData = await req.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) {
      return badRequestError("Avatar file is required.");
    }

    if (!SUPPORTED_CONTENT_TYPES.has(file.type)) {
      return badRequestError("Unsupported image type. Please upload JPG, PNG, WEBP, or GIF.");
    }
    if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
      return badRequestError("Avatar image must be between 1 byte and 5 MB.");
    }

    const extension = extensionForType(file.type);
    const key = `${authUser.userId}/avatars/${Date.now()}-${randomUUID()}.${extension}`;
    const body = Buffer.from(await file.arrayBuffer());

    await s3Client.send(new PutObjectCommand({
      Bucket: aws.bucketName,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    const existing = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, image: true, name: true, email: true },
    });
    if (!existing) {
      return notFoundError("User not found");
    }

    const updated = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        image: `/api/avatar/${encodeURIComponent(key)}`,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    const previousKey = extractAvatarKeyFromPath(existing.image);
    if (previousKey && previousKey !== key) {
      s3Client.send(new DeleteObjectCommand({
        Bucket: aws.bucketName,
        Key: previousKey,
      })).catch(() => {
        logger.warn("Failed to delete previous avatar object", { userId: authUser.userId });
      });
    }

    return apiJson({
      user: {
        id: updated.id,
        name: updated.name ?? "",
        email: updated.email,
        image: updated.image,
      },
    });
  } catch (error) {
    logger.error("Avatar upload error", {
      error: error instanceof Error ? error.message : String(error),
      route: "POST /api/settings/profile/avatar",
    });
    return internalServerError("Failed to upload avatar");
  }
});
