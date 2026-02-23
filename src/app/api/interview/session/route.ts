import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
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
        const { interviewId, videoUrl } = body;

        if (!interviewId) {
            return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
        }

        // Verify the session belongs to this user
        const existing = await prisma.interviewSession.findFirst({
            where: { id: interviewId, userId: user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
        }

        const updated = await prisma.interviewSession.update({
            where: { id: interviewId },
            data: { videoUrl: videoUrl || null },
        });

        return NextResponse.json({ id: updated.id, videoUrl: updated.videoUrl }, { status: 200 });
    } catch (error) {
        console.error("Update interview session error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
