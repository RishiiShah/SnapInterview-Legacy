import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Runtime } from "@/lib/s3/runtime";
import { apiError, internalServerError, notFoundError } from "@/lib/api-response";
import { logger } from "@/utils/logger";

export async function GET(_: Request, context: { params: Promise<{ key?: string[] }> }) {
  try {
    const params = await context.params;
    const rawKey = params.key?.join("/") ?? "";
    const key = decodeURIComponent(rawKey);
    const [userId, directory, filename, ...extraSegments] = key.split("/");

    if (!userId || directory !== "avatars" || !filename || extraSegments.length > 0 || key.includes("..")) {
      return apiError("Invalid avatar key", 400);
    }

    const { client, bucketName } = getS3Runtime();

    const object = await client.send(new GetObjectCommand({
      Bucket: bucketName,
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
