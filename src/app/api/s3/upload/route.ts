import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        // CSRF protection
        const origin = req.headers.get("origin");
        const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        if (!origin || origin !== allowedOrigin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

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

        // Use email as username identifier (everything before @ or the full email safe-stringified)
        const username = session.user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");

        const key = `${username}/interview-${interviewId}.webm`;

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

