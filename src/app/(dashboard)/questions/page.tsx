import { prisma } from "@/lib/prisma";
import QuestionsPageClient from "@/components/questions/QuestionsPageClient";
import { getServerAuthSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import {
  filterQuestionsByScope,
  getAllPracticeQuestions,
} from "@/repositories/question-repo";

export default async function QuestionsPage() {
  const session = await getServerAuthSession();
  
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  let initialSolvedIds: number[] = [];

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        solvedQuestions: {
          select: { questionId: true },
        },
      },
    });

    initialSolvedIds = user?.solvedQuestions.map((item) => item.questionId) ?? [];
  }

  const questions = filterQuestionsByScope(await getAllPracticeQuestions(), "interview");

  return (
    <QuestionsPageClient
      initialSolvedIds={initialSolvedIds}
      questions={questions}
      variant="interview"
    />
  );
}
