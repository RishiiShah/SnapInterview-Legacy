import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod/v4";
import { csrfRejectIfInvalid } from "@/lib/csrf";

const evaluateSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string().trim().max(6000),
});

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evaluateAnswer(answer: string): { score: number; feedback: string } {
  const trimmed = answer.trim();
  if (!trimmed) {
    return {
      score: 0,
      feedback: "No answer submitted. Add a concise story with situation, actions, and measurable outcome.",
    };
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const sentenceCount = trimmed.split(/[.!?]+/).map((segment) => segment.trim()).filter(Boolean).length;

  const lower = trimmed.toLowerCase();
  const hasSituationCue = /\b(situation|context|challenge|problem|when|at my previous)\b/.test(lower);
  const hasActionCue = /\b(i|we)\s+(built|implemented|designed|created|led|improved|optimized|fixed|delivered|launched)\b/.test(lower);
  const hasResultCue = /\b(result|impact|outcome|improved|reduced|increased|grew|saved)\b/.test(lower);
  const hasMetrics = /\b\d+(?:\.\d+)?\s*(%|percent|x|ms|sec|seconds|minutes|hours|days|users|customers|tickets|bugs|k|m)\b/i.test(trimmed);

  let score = 0;

  if (wordCount >= 30) score += 20;
  else score += (wordCount / 30) * 20;

  if (wordCount >= 80) score += 15;
  else score += (Math.min(wordCount, 80) / 80) * 15;

  if (sentenceCount >= 3) score += 15;
  else score += (sentenceCount / 3) * 15;

  if (hasSituationCue) score += 15;
  if (hasActionCue) score += 15;
  if (hasResultCue) score += 10;
  if (hasMetrics) score += 10;

  const normalizedScore = clampScore(score);

  if (normalizedScore >= 85) {
    return {
      score: normalizedScore,
      feedback:
        "Strong answer: clear structure, specific actions, and measurable impact. Tighten the opening to make it even sharper.",
    };
  }

  if (normalizedScore >= 70) {
    return {
      score: normalizedScore,
      feedback:
        "Solid response. Improve by making the situation and impact more explicit, ideally with one concrete metric.",
    };
  }

  if (normalizedScore >= 45) {
    return {
      score: normalizedScore,
      feedback:
        "Decent start, but it needs stronger structure. Use STAR: Situation, Task, Action, Result, and quantify outcomes.",
    };
  }

  return {
    score: normalizedScore,
    feedback:
      "Response is too brief or generic. Add context, your specific actions, and a measurable result to improve clarity and impact.",
  };
}

export async function POST(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = evaluateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { answer } = parsed.data;
    const result = evaluateAnswer(answer);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Question evaluation error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
