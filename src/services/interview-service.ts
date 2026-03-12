import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { sanitizeChatMessages } from "@/lib/interview/chat-messages";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { groqClient } from "@/lib/ai/groq";
import { prisma } from "@/lib/prisma";
import {
  createInterviewSession,
  getInterviewSession,
  incrementCurrentQuestion,
  updateInterviewSessionStatus,
} from "@/repositories/interview-repo";

export const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
export const ALLOWED_QUESTION_COUNTS = [5, 10, 15] as const;

function deriveAdaptiveFocusAreas(params: {
  type: string;
  difficulty: string;
  onboardingGoal?: string | null;
  onboardingLevel?: string | null;
}) {
  const { type, difficulty, onboardingGoal, onboardingLevel } = params;

  const focusAreas = [
    `${type} fundamentals`,
    difficulty === "hard" ? "trade-off reasoning" : "structured communication",
  ];

  if (onboardingGoal === "land-first-role") {
    focusAreas.push("clear storytelling", "confidence and pacing");
  }

  if (onboardingGoal === "switch-companies") {
    focusAreas.push("impact quantification", "high-signal examples");
  }

  if (onboardingGoal === "prepare-for-promo") {
    focusAreas.push("leadership scope", "decision rationale");
  }

  if (onboardingGoal === "sharpen-communication") {
    focusAreas.push("concise answers", "structured follow-through");
  }

  if (onboardingLevel === "staff-plus") {
    focusAreas.push("organizational trade-offs");
  }

  return Array.from(new Set(focusAreas)).slice(0, 5);
}

function buildAdaptiveSessionPlan(params: {
  questionCount: number;
  difficulty: string;
  persona: string;
  onboardingLevel?: string | null;
  onboardingGoal?: string | null;
}) {
  const { questionCount, difficulty, persona, onboardingLevel, onboardingGoal } = params;

  return {
    pacing: ["warmup", "core", "challenge"],
    targetLevel: onboardingLevel ?? difficulty,
    goal: onboardingGoal ?? "switch-companies",
    persona,
    followUpBias:
      persona === "strict"
        ? "probe weak answers quickly"
        : persona === "friendly"
          ? "coach lightly before escalating"
          : "balance encouragement with pressure",
    questionCount,
  };
}

export async function getInterviewSessionState(params: { userId: string; interviewId: string }) {
  return getInterviewSession({ ...params, view: "state" });
}

export async function startInterviewSession(params: {
  userId: string;
  role: string;
  company?: string | null;
  type: string;
  difficulty: string;
  persona?: string;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  questionCount?: number;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      onboardingGoal: true,
      onboardingLevel: true,
      onboardingRole: true,
      onboardingCompany: true,
    },
  });

  const questionCount = params.questionCount ?? 10;
  const persona = params.persona ?? "balanced";
  const role = params.role || user?.onboardingRole || "Generalist";
  const company = params.company ?? user?.onboardingCompany ?? null;

  const focusAreas = deriveAdaptiveFocusAreas({
    type: params.type,
    difficulty: params.difficulty,
    onboardingGoal: user?.onboardingGoal,
    onboardingLevel: user?.onboardingLevel,
  });

  const sessionPlan = buildAdaptiveSessionPlan({
    questionCount,
    difficulty: params.difficulty,
    persona,
    onboardingLevel: user?.onboardingLevel,
    onboardingGoal: user?.onboardingGoal,
  });

  return createInterviewSession({
    ...params,
    role,
    company,
    persona,
    questionCount,
    focusAreas: focusAreas as unknown as Prisma.InputJsonValue,
    sessionPlan: sessionPlan as unknown as Prisma.InputJsonValue,
  });
}

export async function updateSessionStatusIfOwned(params: {
  userId: string;
  interviewId: string;
  videoUrl?: string | null;
  status?: InterviewStatus;
}) {
  const { userId, interviewId, videoUrl, status } = params;
  const existing = await getInterviewSession({ interviewId, userId, view: "state" });

  if (!existing) {
    return { type: "not_found" as const };
  }

  const updated = await updateInterviewSessionStatus({ interviewId, userId, videoUrl, status });
  return { type: "ok" as const, data: updated };
}

export async function runInterviewChat(params: {
  userId: string;
  interviewId: string;
  rawMessages: unknown;
}): Promise<
  | { type: "not_found" }
  | { type: "done"; data: { done: true; currentQuestion: number; doneMessage: string } }
  | { type: "stream"; data: ReadableStream<Uint8Array> }
> {
  const { userId, interviewId, rawMessages } = params;
  const messages = sanitizeChatMessages(rawMessages);

  const interviewSession = await getInterviewSession({ interviewId, userId, view: "chat" });
  if (!interviewSession) {
    return { type: "not_found" };
  }

  const { questionCount, currentQuestion } = interviewSession;
  if (currentQuestion >= questionCount) {
    await saveLatestTranscriptEntry({ interviewId, currentQuestion, messages });

    return {
      type: "done",
      data: { done: true, currentQuestion, doneMessage: INTERVIEW_DONE_MESSAGE },
    };
  }

  const systemInstructionPromise = Promise.resolve().then(() =>
    buildSystemInstruction(interviewSession)
  );

  const [, systemInstruction] = await Promise.all([
    saveLatestTranscriptEntry({ interviewId, currentQuestion, messages }),
    systemInstructionPromise,
  ]);
  const formattedMessages = [
    { role: "system" as const, content: systemInstruction },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];

  const chatCompletion = await groqClient.chat.completions.create({
    messages: formattedMessages,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: true,
  });

  await incrementCurrentQuestion(interviewId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chatCompletion) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return { type: "stream", data: stream };
}
