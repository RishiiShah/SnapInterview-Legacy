import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
const MAX_TRANSCRIPT_ENTRIES = 100;

function csrfCheck(req: Request): NextResponse | null {
    const origin = req.headers.get("origin");
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    if (!origin || origin !== allowedOrigin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
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
        const { role, company, type, difficulty, jobDescription, resumeUrl } = body;

        if (!role || !type || !difficulty) {
            return NextResponse.json(
                { error: "role, type, and difficulty are required" },
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
        const { interviewId, videoUrl, transcript, status } = body;

        if (!interviewId || typeof interviewId !== "string") {
            return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
        }

        // Validate status if provided
        if (status && !(ALLOWED_STATUSES as readonly string[]).includes(status)) {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        // Validate transcript if provided
        if (transcript !== undefined) {
            if (!Array.isArray(transcript)) {
                return NextResponse.json({ error: "transcript must be an array" }, { status: 400 });
            }
            if (transcript.length > MAX_TRANSCRIPT_ENTRIES) {
                return NextResponse.json({ error: `transcript exceeds maximum of ${MAX_TRANSCRIPT_ENTRIES} entries` }, { status: 400 });
            }
            for (const entry of transcript) {
                if (typeof entry.question !== "string" || !entry.question.trim()) {
                    return NextResponse.json({ error: "Each transcript entry must have a non-empty question" }, { status: 400 });
                }
                if (typeof entry.answer !== "string" || !entry.answer.trim()) {
                    return NextResponse.json({ error: "Each transcript entry must have a non-empty answer" }, { status: 400 });
                }
            }
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

        // Save transcript entries if provided (idempotent: clear existing before insert)
        if (Array.isArray(transcript) && transcript.length > 0) {
            await prisma.transcriptEntry.deleteMany({
                where: { interviewSessionId: interviewId },
            });
            await prisma.transcriptEntry.createMany({
                data: transcript.map((entry: { question: string; answer: string }, index: number) => ({
                    interviewSessionId: interviewId,
                    order: index,
                    question: entry.question,
                    answer: entry.answer,
                })),
            });
        }

        return NextResponse.json({ id: updated.id, videoUrl: updated.videoUrl }, { status: 200 });
    } catch (error) {
        console.error("Update interview session error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
