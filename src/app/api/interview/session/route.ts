import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
const ALLOWED_QUESTION_COUNTS = [5, 10, 15] as const;

function csrfCheck(req: Request): NextResponse | null {
    const origin = req.headers.get("origin");
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    if (!origin || origin !== allowedOrigin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const interviewId = searchParams.get("interviewId");

        if (!interviewId) {
            return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const interviewSession = await prisma.interviewSession.findFirst({
            where: { id: interviewId, userId: user.id },
            select: {
                id: true,
                status: true,
                questionCount: true,
                currentQuestion: true,
            },
        });

        if (!interviewSession) {
            return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
        }

        return NextResponse.json(interviewSession, { status: 200 });
    } catch (error) {
        console.error("Get interview session error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const csrfError = csrfCheck(req);
        if (csrfError) return csrfError;

        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { role, company, type, difficulty, jobDescription, resumeUrl, questionCount } = body;

        if (!role || !type || !difficulty) {
            return NextResponse.json(
                { error: "role, type, and difficulty are required" },
                { status: 400 }
            );
        }

        if (
            questionCount !== undefined &&
            !ALLOWED_QUESTION_COUNTS.includes(questionCount)
        ) {
            return NextResponse.json(
                { error: "questionCount must be one of: 5, 10, 15" },
                { status: 400 }
            );
        }

        const interviewSession = await prisma.interviewSession.create({
            data: {
                userId: user.id,
                role,
                company: company || null,
                type,
                difficulty,
                jobDescription: jobDescription || null,
                resumeUrl: resumeUrl || null,
                questionCount: questionCount ?? 10,
            },
        });

        return NextResponse.json({ id: interviewSession.id }, { status: 201 });
    } catch (error) {
        console.error("Create interview session error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const csrfError = csrfCheck(req);
        if (csrfError) return csrfError;

        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { interviewId, videoUrl, status } = body;

        if (!interviewId || typeof interviewId !== "string") {
            return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
        }

        // Validate status if provided
        if (status && !(ALLOWED_STATUSES as readonly string[]).includes(status)) {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        // Verify the session belongs to this user
        const existing = await prisma.interviewSession.findFirst({
            where: { id: interviewId, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
        }

        // Update video URL and status
        const updated = await prisma.interviewSession.update({
            where: { id: interviewId },
            data: {
                videoUrl: videoUrl || null,
                ...(status && { status }),
            },
        });

        return NextResponse.json({ id: updated.id, videoUrl: updated.videoUrl }, { status: 200 });
    } catch (error) {
        console.error("Update interview session error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
