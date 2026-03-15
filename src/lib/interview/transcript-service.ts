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
  const transcriptData = {
    question: latestAnsweredPair.question,
    answer: latestAnsweredPair.answer,
  };

  const updateResult = await prisma.transcriptEntry.updateMany({
    where: {
      interviewSessionId: interviewId,
      order: transcriptOrder,
    },
    data: transcriptData,
  });

  if (updateResult.count > 0) {
    return;
  }

  try {
    await prisma.transcriptEntry.create({
      data: {
        interviewSessionId: interviewId,
        order: transcriptOrder,
        ...transcriptData,
      },
    });
  } catch {
    await prisma.transcriptEntry.updateMany({
      where: {
        interviewSessionId: interviewId,
        order: transcriptOrder,
      },
      data: transcriptData,
    });
  }
}
