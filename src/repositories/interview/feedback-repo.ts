import { prisma } from "@/lib/prisma";

export async function upsertQuestionFeedback(params: {
  interviewSessionId: string;
  questionOrder: number;
  rating: "up" | "down";
}): Promise<void> {
  await prisma.questionFeedback.upsert({
    where: {
      interviewSessionId_questionOrder: {
        interviewSessionId: params.interviewSessionId,
        questionOrder: params.questionOrder,
      },
    },
    create: {
      interviewSessionId: params.interviewSessionId,
      questionOrder: params.questionOrder,
      rating: params.rating,
    },
    update: { rating: params.rating },
  });
}

export async function getQuestionFeedbackForSession(interviewSessionId: string): Promise<
  Array<{ questionOrder: number; rating: string }>
> {
  return prisma.questionFeedback.findMany({
    where: { interviewSessionId },
    select: { questionOrder: true, rating: true },
    orderBy: { questionOrder: "asc" },
  });
}
