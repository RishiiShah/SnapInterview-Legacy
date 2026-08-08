import { Prisma, type InterviewStatus } from "@/generated/prisma/client";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import {
  normalizePromptInterviewSession,
  type Difficulty,
  type InterviewPersona,
  type InterviewQuestionCount,
  type InterviewType,
  type StartInterviewSessionInput,
} from "@/lib/interview/domain";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { sanitizeChatMessages } from "@/lib/interview/chat-messages";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { groqClient } from "@/lib/ai/groq";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/utils/retry";
import { logger } from "@/utils/logger";
import {
  advanceInterviewCurrentQuestion,
  createInterviewSession,
  getInterviewSession,
  updateInterviewSessionStatus,
} from "@/repositories/interview-repo";

export const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
export const ALLOWED_QUESTION_COUNTS = [5, 10, 15] as const satisfies readonly InterviewQuestionCount[];

function deriveAdaptiveFocusAreas(params: {
  type: InterviewType;
  difficulty: Difficulty;
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
  questionCount: InterviewQuestionCount;
  difficulty: Difficulty;
  persona: InterviewPersona;
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

export async function startInterviewSession(params: StartInterviewSessionInput) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      onboardingGoal: true,
      onboardingLevel: true,
      onboardingRole: true,
      onboardingCompany: true,
    },
  });

  const questionCount: InterviewQuestionCount = params.questionCount ?? 10;
  const persona: InterviewPersona = params.persona ?? "balanced";
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

  const session = await createInterviewSession({
    ...params,
    role,
    company,
    persona,
    questionCount,
    focusAreas: focusAreas as unknown as Prisma.InputJsonValue,
    sessionPlan: sessionPlan as unknown as Prisma.InputJsonValue,
  });

  invalidateInterviewMetricsCache(params.userId);
  return session;
}

export async function updateSessionStatusIfOwned(params: {
  userId: string;
  interviewId: string;
  videoUrl?: string | null;
  videoKey?: string | null;
  status?: InterviewStatus;
}) {
  const { userId, interviewId, videoUrl, videoKey, status } = params;
  const existing = await getInterviewSession({ interviewId, userId, view: "state" });

  if (!existing) {
    return { type: "not_found" as const };
  }

  // Idempotency: If already finalized, only allow updating videoUrl if it's currently null.
  if (existing.status !== "IN_PROGRESS") {
    if ((videoUrl && !existing.videoUrl) || (videoKey && !existing.videoKey)) {
      try {
        const updated = await updateInterviewSessionStatus({ interviewId, userId, videoUrl, videoKey });
        invalidateInterviewMetricsCache(userId);
        return { type: "ok" as const, data: updated };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes("videoKey")
        ) {
          return { type: "conflict" as const, message: "Video recording is already linked to another interview session." };
        }

        throw error;
      }
    }
    return { type: "ok" as const, data: existing };
  }

  try {
    const updated = await updateInterviewSessionStatus({ interviewId, userId, videoUrl, videoKey, status });
    invalidateInterviewMetricsCache(userId);
    return { type: "ok" as const, data: updated };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("videoKey")
    ) {
      return { type: "conflict" as const, message: "Video recording is already linked to another interview session." };
    }

    throw error;
  }
}

export async function runInterviewChat(params: {
  userId: string;
  interviewId: string;
  rawMessages: unknown;
  expectedCurrentQuestion: number;
  abortSignal?: AbortSignal;
}): Promise<
  | { type: "not_found" }
  | { type: "error"; message: string }
  | { type: "conflict"; message: string; currentQuestion: number }
  | { type: "done"; data: { done: true; currentQuestion: number; doneMessage: string } }
  | { type: "stream"; data: ReadableStream<Uint8Array> }
> {
  const { userId, interviewId, rawMessages, expectedCurrentQuestion, abortSignal } = params;
  const messages = sanitizeChatMessages(rawMessages);

  const interviewSession = await getInterviewSession({ interviewId, userId, view: "chat" });
  if (!interviewSession) {
    return { type: "not_found" };
  }

  const { questionCount, currentQuestion } = interviewSession;
  if (currentQuestion !== expectedCurrentQuestion) {
    return {
      type: "conflict",
      message: "Interview state changed. Please wait for the current question to finish loading and try again.",
      currentQuestion,
    };
  }

  if (currentQuestion >= questionCount) {
    await saveLatestTranscriptEntry({ interviewId, currentQuestion, messages });
    invalidateInterviewMetricsCache(userId);

    return {
      type: "done",
      data: { done: true, currentQuestion, doneMessage: INTERVIEW_DONE_MESSAGE },
    };
  }

  // userId is threaded through so retrieval can exclude questions this user was
  // already asked in earlier sessions. The "chat" view does not select it.
  const promptInterviewSession = normalizePromptInterviewSession({ ...interviewSession, userId });
  if (!promptInterviewSession) {
    logger.error("Interview session contains invalid domain values", { interviewId });
    return { type: "error", message: "Interview session is invalid. Please start a new session." };
  }

  void Promise.resolve(saveLatestTranscriptEntry({ interviewId, currentQuestion, messages })).catch((error) => {
    logger.error("Unable to save interview transcript entry", {
      interviewId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  const systemInstruction = await buildSystemInstruction(promptInterviewSession);
  const formattedMessages = [
    { role: "system" as const, content: systemInstruction },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];

  try {
    const chatCompletion = await withRetry(async () => {
      return groqClient.chat.completions.create({
        messages: formattedMessages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: true,
      }, { signal: abortSignal });
    }, { signal: abortSignal });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const onAbort = () => {
          try {
            controller.error(new Error("Operation aborted"));
          } catch {
            // Already closed
          }
        };

        if (abortSignal?.aborted) {
          onAbort();
          return;
        }

        abortSignal?.addEventListener("abort", onAbort, { once: true });

        try {
          for await (const chunk of chatCompletion) {
            if (abortSignal?.aborted) break;

            const content = chunk.choices[0]?.delta?.content ?? "";
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }

          if (!abortSignal?.aborted) {
            const advanced = await advanceInterviewCurrentQuestion({
              interviewId,
              userId,
              expectedCurrentQuestion: currentQuestion,
            });

            if (!advanced) {
              throw new Error("Interview state out of date");
            }

            invalidateInterviewMetricsCache(userId);
            controller.close();
          }
        } catch (error) {
          controller.error(error);
        } finally {
          abortSignal?.removeEventListener("abort", onAbort);
        }
      },
    });

    return { type: "stream", data: stream };
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === "AbortError" || abortSignal?.aborted)) {
      logger.info("Interview chat request cancelled", { interviewId });
      // We still need to return something or the API route will throw.
      // But since the request is aborted, the response won't reach the client.
      return { type: "error", message: "Request cancelled" };
    }
    logger.error("Interview chat error after retries", { error: error instanceof Error ? error.message : String(error), interviewId });
    return { type: "error", message: "Failed to connect to the interview AI. Please try again." };
  }
}
