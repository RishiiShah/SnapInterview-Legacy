import type { InterviewStatus } from "@/generated/prisma/client";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { buildSystemInstruction } from "@/lib/interview/prompts";
import { sanitizeChatMessages } from "@/lib/interview/chat-messages";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { groqClient } from "@/lib/ai/groq";
import {
  createInterviewSession,
  getInterviewSession,
  incrementCurrentQuestion,
  updateInterviewSessionStatus,
} from "@/repositories/interview-repo";

export const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
export const ALLOWED_QUESTION_COUNTS = [5, 10, 15] as const;

export async function getInterviewSessionState(params: { userId: string; interviewId: string }) {
  return getInterviewSession({ ...params, view: "state" });
}

export async function startInterviewSession(params: {
  userId: string;
  role: string;
  company?: string | null;
  type: string;
  difficulty: string;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  questionCount?: number;
}) {
  return createInterviewSession(params);
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

  const updated = await updateInterviewSessionStatus({ interviewId, videoUrl, status });
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
