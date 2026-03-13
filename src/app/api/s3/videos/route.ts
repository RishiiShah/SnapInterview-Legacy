import { csrfRejectIfInvalid } from "@/lib/csrf";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSessionUserIdentity } from "@/lib/server-auth";
import {
  apiError,
  apiJson,
  badRequestError,
  internalServerError,
  unauthorizedError,
} from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { listUserVideos } from "@/lib/s3/videos";
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod/v4";

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

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const prefix = `${authUser.userId}/`;
    const videos = await listUserVideos(prefix);

    return apiJson({ videos });
  } catch (error) {
    console.error("Error fetching videos from S3:", error);
    return internalServerError("Failed to fetch videos");
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

    return apiJson({ success: true });
  } catch (error) {
    console.error("Error deleting video from S3:", error);
    return internalServerError("Failed to delete video");
  }
}
