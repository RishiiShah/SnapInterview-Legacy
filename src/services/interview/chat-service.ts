import { INTERVIEW_DONE_MESSAGE, INTERVIEW_RESUME_WINDOW_MS } from "@/lib/interview/constants";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import { normalizePromptInterviewSession } from "@/lib/interview/domain";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { extractLatestAnsweredPair, sanitizeChatMessages } from "@/lib/interview/chat-messages";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { groqClient } from "@/lib/ai/groq";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { withRetry } from "@/utils/retry";
import { logger } from "@/utils/logger";
import {
  expireInterviewSessionIfStale,
  getInterviewSession,
} from "@/repositories/interview-repo";
import { INTERVIEW_GRACE_PERIOD_MS } from "./session-lifecycle-service";
import { persistWhiteboardEvidence } from "./whiteboard-evidence";
import { buildProviderMessages } from "./chat-message-builder";
import { createChatStream } from "./chat-stream";

export async function runInterviewChat(params: {
  userId: string;
  interviewId: string;
  rawMessages: unknown;
  expectedCurrentQuestion: number;
  abortSignal?: AbortSignal;
}): Promise<
  | { type: "not_found" }
  | { type: "expired" }
  | { type: "error"; message: string }
  | { type: "conflict"; message: string; currentQuestion: number }
  | { type: "done"; data: { done: true; currentQuestion: number; doneMessage: string } }
  | { type: "stream"; data: ReadableStream<Uint8Array> }
> {
  const { userId, interviewId, rawMessages, expectedCurrentQuestion, abortSignal } = params;
  const messages = sanitizeChatMessages(rawMessages);
  const cutoff = new Date(Date.now() - INTERVIEW_RESUME_WINDOW_MS);

  if (await expireInterviewSessionIfStale({ interviewId, userId, cutoff })) {
    invalidateInterviewMetricsCache(userId);
    return { type: "expired" };
  }

  const interviewSession = await getInterviewSession({ interviewId, userId, view: "chat" });
  if (!interviewSession || interviewSession.status !== "IN_PROGRESS") {
    return { type: "not_found" };
  }

  const { questionCount, currentQuestion, durationMinutes, createdAt } = interviewSession;
  if (currentQuestion !== expectedCurrentQuestion) {
    return {
      type: "conflict",
      message: "Interview state changed. Please wait for the current question to finish loading and try again.",
      currentQuestion,
    };
  }

  // Board attachments are only meaningful for system-design rounds. Persist them
  // before the completion branch so the final answer is available to evaluation.
  const isSystemDesignRound = interviewSession.type === "system-design";
  const lastUserMsg = messages.length > 0 && messages[messages.length - 1].role === "user" ? messages[messages.length - 1] : null;
  const boardAttachment = isSystemDesignRound ? lastUserMsg?.board : undefined;

  const whiteboardPersistence = boardAttachment?.scene
    ? persistWhiteboardEvidence({
        interviewId,
        userId,
        expectedCurrentQuestion,
        existingSessionPlan: interviewSession.sessionPlan,
        board: boardAttachment,
      })
    : null;

  const sessionDurationMinutes = durationMinutes ?? 30;
  const sessionAgeMs = createdAt ? Date.now() - new Date(createdAt).getTime() : 0;
  const maxAllowedSessionMs = sessionDurationMinutes * 60_000 + INTERVIEW_GRACE_PERIOD_MS;
  const isTimeExpired = createdAt ? sessionAgeMs >= maxAllowedSessionMs : false;
  const isQuestionCountReached =
    typeof questionCount === "number" && questionCount > 0 && currentQuestion >= questionCount;

  if (isTimeExpired || isQuestionCountReached) {
    await whiteboardPersistence?.catch((err) => {
      logger.warn("Failed to persist whiteboard evidence on session", { interviewId, error: String(err) });
    });
    await saveLatestTranscriptEntry({ interviewId, currentQuestion, messages });
    invalidateInterviewMetricsCache(userId);

    return {
      type: "done",
      data: { done: true, currentQuestion, doneMessage: INTERVIEW_DONE_MESSAGE },
    };
  }

  void whiteboardPersistence?.catch((err) => {
    logger.warn("Failed to persist whiteboard evidence on session", { interviewId, error: String(err) });
  });

  const latestAnsweredPair = extractLatestAnsweredPair(messages);
  const promptInterviewSession = normalizePromptInterviewSession({
    ...interviewSession,
    durationMinutes: sessionDurationMinutes,
    startedAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    userId,
    transcript: latestAnsweredPair
      ? [{ ...latestAnsweredPair, order: Math.max(currentQuestion - 1, 0) }]
      : interviewSession.transcript,
  });
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
  const formattedMessages = buildProviderMessages({
    systemInstruction,
    messages,
    isSystemDesignRound,
  });

  try {
    const chatCompletion = await withRetry(async () => {
      return groqClient.chat.completions.create({
        messages: formattedMessages as ChatCompletionMessageParam[],
        model: "qwen/qwen3.6-27b",
        temperature: 0.6,
        max_completion_tokens: 2048,
        top_p: 0.95,
        stream: true,
        reasoning_effort: "none",
        stop: null,
      }, { signal: abortSignal });
    }, { signal: abortSignal });

    const stream = createChatStream({
      chatCompletion,
      abortSignal,
      interviewId,
      userId,
      currentQuestion,
    });

    return { type: "stream", data: stream };
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === "AbortError" || abortSignal?.aborted)) {
      logger.info("Interview chat request cancelled", { interviewId });
      return { type: "error", message: "Request cancelled" };
    }
    logger.error("Interview chat error after retries", { error: error instanceof Error ? error.message : String(error), interviewId });
    return { type: "error", message: "Failed to connect to the interview AI. Please try again." };
  }
}
