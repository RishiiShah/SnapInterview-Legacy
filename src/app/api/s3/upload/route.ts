import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const session = await getServerSession();

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { interviewId } = await req.json();

        if (!interviewId || typeof interviewId !== "string") {
            return NextResponse.json({ error: "Interview ID is required" }, { status: 400 });
        }

        // Verify the interview session belongs to this user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const interviewSession = await prisma.interviewSession.findFirst({
            where: { id: interviewId, userId: user.id },
        });

        if (!interviewSession) {
            return NextResponse.json({ error: "Interview session not found" }, { status: 403 });
        }

        const key = `${user.id}/interview-${interviewId}.webm`;

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
            ContentType: "video/webm",
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

        return NextResponse.json({ url: presignedUrl, key });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
    }
}

