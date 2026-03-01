import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { z } from "zod/v4";

const toggleSolvedSchema = z.object({
  questionId: z.number().int().positive(),
});

async function getAuthedUserId() {
  const session = await getServerSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const solved = await prisma.solvedQuestion.findMany({
      where: { userId },
      select: { questionId: true },
      orderBy: { solvedAt: "desc" },
    });

    return NextResponse.json({ solvedQuestionIds: solved.map((item) => item.questionId) });
  } catch (error) {
    console.error("Get solved questions error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const userId = await getAuthedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = toggleSolvedSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { questionId } = parsed.data;

    const existing = await prisma.solvedQuestion.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.solvedQuestion.delete({ where: { id: existing.id } });
      return NextResponse.json({ solved: false, questionId }, { status: 200 });
    }

    await prisma.solvedQuestion.create({
      data: {
        userId,
        questionId,
      },
    });

    return NextResponse.json({ solved: true, questionId }, { status: 200 });
  } catch (error) {
    console.error("Toggle solved question error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
