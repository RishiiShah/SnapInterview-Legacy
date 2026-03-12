import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";

const aws = requireAwsS3Env();

const s3Client = new S3Client({
    region: aws.region,
    credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
    },
});

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { interviewId } = await req.json();

        if (!interviewId || typeof interviewId !== "string") {
            return badRequestError("Interview ID is required");
        }

        // Verify the interview session belongs to this user
        const interviewSession = await prisma.interviewSession.findFirst({
            where: { id: interviewId, userId: authUser.userId },
        });

        if (!interviewSession) {
            return apiError("Interview session not found", 403);
        }

        const key = `${authUser.userId}/interview-${interviewId}.webm`;

        const command = new PutObjectCommand({
            Bucket: aws.bucketName,
            Key: key,
            ContentType: "video/webm",
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

        return apiJson({ url: presignedUrl, key });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return internalServerError("Failed to generate presigned URL");
    }
}

