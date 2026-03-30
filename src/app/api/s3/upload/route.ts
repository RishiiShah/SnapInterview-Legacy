import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
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

const uploadSchema = z.object({
    interviewId: z.string().uuid("interviewId must be a valid UUID"),
});

const uploadLimiter = createRateLimiter("s3-upload", 10 * 60 * 1000, 20);

export const POST = withCsrfProtection(async (req: Request) => {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        if (await uploadLimiter.isLimited(authUser.userId)) {
            return apiError("Too many upload requests. Please try again later.", 429);
        }

        const body = await req.json();
        const parsed = uploadSchema.safeParse(body);

        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { interviewId } = parsed.data;

        // Verify the interview session belongs to this user
        const interviewSession = await prisma.interviewSession.findFirst({
            where: { id: interviewId, userId: authUser.userId },
            select: {
                id: true,
                videoKey: true,
            },
        });

        if (!interviewSession) {
            return apiError("Interview session not found", 403);
        }

        if (interviewSession.videoKey) {
            return apiError("Recording already exists for this interview session.", 409);
        }

        const key = `${authUser.userId}/interview-${interviewId}.webm`;

        const { url, fields } = await createPresignedPost(s3Client, {
            Bucket: aws.bucketName,
            Key: key,
            Conditions: [
                ["content-length-range", 0, 500 * 1024 * 1024], // 500 MB max
                ["eq", "$Content-Type", "video/webm"],
            ],
            Fields: { "Content-Type": "video/webm" },
            Expires: 3600,
        });

        return apiJson({ url, fields, key });
    } catch (error) {
        logger.error("Error generating presigned URL", {
            error: error instanceof Error ? error.message : String(error),
            route: "POST /api/s3/upload",
        });
        return internalServerError("Failed to generate presigned URL");
    }
});
