import { prisma } from "@/lib/prisma";
import QuestionsPageClient from "@/components/questions/QuestionsPageClient";
import { getServerAuthSession } from "@/lib/server-auth";

export default async function QuestionsPage() {
  const session = await getServerAuthSession();
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
