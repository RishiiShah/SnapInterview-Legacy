import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type SharedInterviewView = {
  role: string;
  company: string | null;
  type: string;
  difficulty: string;
  evaluation: Record<string, unknown> | null;
  createdAt: Date;
};

export async function generateShareToken(params: {
  interviewId: string;
  userId: string;
}): Promise<string | null> {
  const token = randomBytes(16).toString("hex");
  const result = await prisma.interviewSession.updateMany({
    where: { id: params.interviewId, userId: params.userId, deletedAt: null, status: "COMPLETED" },
    data: { shareToken: token },
  });
  return result.count > 0 ? token : null;
}

export async function revokeShareToken(params: {
  interviewId: string;
  userId: string;
}): Promise<boolean> {
  const result = await prisma.interviewSession.updateMany({
    where: { id: params.interviewId, userId: params.userId, deletedAt: null },
    data: { shareToken: null },
  });
  return result.count > 0;
}

export async function getShareToken(params: {
  interviewId: string;
  userId: string;
}): Promise<string | null> {
  const session = await prisma.interviewSession.findFirst({
    where: { id: params.interviewId, userId: params.userId, deletedAt: null },
    select: { shareToken: true },
  });
  return session?.shareToken ?? null;
}

export async function getSharedInterview(token: string): Promise<SharedInterviewView | null> {
  const session = await prisma.interviewSession.findUnique({
    where: { shareToken: token },
    select: {
      role: true,
      company: true,
      type: true,
      difficulty: true,
      evaluation: true,
      createdAt: true,
      deletedAt: true,
    },
  });
  if (!session || session.deletedAt) return null;
  return {
    role: session.role,
    company: session.company,
    type: session.type,
    difficulty: session.difficulty,
    evaluation: session.evaluation as Record<string, unknown> | null,
    createdAt: session.createdAt,
  };
}
