import { prisma } from "@/lib/prisma";
import QuestionsPageClient from "@/components/questions/QuestionsPageClient";
import { getServerAuthSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { getAllPracticeQuestions } from "@/repositories/question-repo";

export default async function QuestionsPage() {
  const session = await getServerAuthSession();
  
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [solvedQuestions, questions] = await Promise.all([
    prisma.solvedQuestion.findMany({
      where: { userId },
      select: { questionId: true },
    }),
    getAllPracticeQuestions(),
  ]);
  const initialSolvedIds = solvedQuestions.map((item) => item.questionId);

  return (
    <QuestionsPageClient
      initialSolvedIds={initialSolvedIds}
      questions={questions}
    />
  );
}
