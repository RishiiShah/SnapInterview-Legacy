import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requireAwsS3Env } from "@/lib/env";
import { apiError, internalServerError, notFoundError } from "@/lib/api-response";
import { logger } from "@/utils/logger";

const aws = requireAwsS3Env();
const s3Client = new S3Client({
  region: aws.region,
  credentials: {
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
  },
});

export async function GET(_: Request, context: { params: Promise<{ key?: string[] }> }) {
  try {
    const params = await context.params;
    const rawKey = params.key?.join("/") ?? "";
    const key = decodeURIComponent(rawKey);
    const [userId, directory, filename, ...extraSegments] = key.split("/");

    if (!userId || directory !== "avatars" || !filename || extraSegments.length > 0 || key.includes("..")) {
      return apiError("Invalid avatar key", 400);
    }

    const object = await s3Client.send(new GetObjectCommand({
      Bucket: aws.bucketName,
      Key: key,
    }));

    if (!object.Body) {
      return notFoundError("Avatar not found");
    }

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("nosuchkey")) {
      return notFoundError("Avatar not found");
    }

    logger.error("Avatar fetch error", {
      error: message,
      route: "GET /api/avatar/[...key]",
    });
    return internalServerError("Failed to fetch avatar");
  }
}
