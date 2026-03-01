import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import QuestionsPageClient from "@/components/questions/QuestionsPageClient";

export default async function QuestionsPage() {
  const session = await getServerSession();
  const email = session?.user?.email?.toLowerCase();

  let initialSolvedIds: number[] = [];

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        solvedQuestions: {
          select: { questionId: true },
        },
      },
    });

    initialSolvedIds = user?.solvedQuestions.map((item) => item.questionId) ?? [];
  }

  return <QuestionsPageClient initialSolvedIds={initialSolvedIds} />;
}
