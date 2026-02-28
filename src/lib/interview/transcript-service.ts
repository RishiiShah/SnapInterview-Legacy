import { prisma } from "@/lib/prisma";
import { extractLatestAnsweredPair, type InterviewChatMessage } from "@/lib/interview/chat-messages";

export async function saveLatestTranscriptEntry(params: {
  interviewId: string;
  currentQuestion: number;
  messages: InterviewChatMessage[];
}) {
  const { interviewId, currentQuestion, messages } = params;

  const latestAnsweredPair = extractLatestAnsweredPair(messages);
  if (!latestAnsweredPair || currentQuestion <= 0) {
    return;
  }

  const transcriptOrder = currentQuestion - 1;

  await prisma.$transaction([
    prisma.transcriptEntry.deleteMany({
      where: {
        interviewSessionId: interviewId,
        order: transcriptOrder,
      },
    }),
    prisma.transcriptEntry.create({
      data: {
        interviewSessionId: interviewId,
        order: transcriptOrder,
        question: latestAnsweredPair.question,
        answer: latestAnsweredPair.answer,
      },
    }),
  ]);
}
