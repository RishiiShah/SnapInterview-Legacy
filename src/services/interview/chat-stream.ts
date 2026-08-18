import { advanceInterviewCurrentQuestion } from "@/repositories/interview-repo";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";

export type InterviewProviderChunk = {
  choices: Array<{
    delta?: { content?: string | null };
  }>;
};

export function createChatStream(params: {
  chatCompletion: unknown;
  abortSignal?: AbortSignal;
  interviewId: string;
  userId: string;
  currentQuestion: number;
}): ReadableStream<Uint8Array> {
  const { chatCompletion, abortSignal, interviewId, userId, currentQuestion } = params;

  return new ReadableStream<Uint8Array>({
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
        const streamChunks = chatCompletion as unknown as AsyncIterable<InterviewProviderChunk>;
        for await (const chunk of streamChunks) {
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
}
