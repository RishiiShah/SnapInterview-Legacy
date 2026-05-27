import { prisma } from "@/lib/prisma";
import { AdminQuestionForm } from "@/components/admin/AdminQuestionForm";
import { updatePracticeQuestionAction } from "../../actions";
import { redirect } from "next/navigation";

export default async function AdminQuestionsEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const idNum = Number(params.id);
  if (!Number.isFinite(idNum)) {
    redirect("/admin/questions");
  }

  const q = await prisma.practiceQuestion.findUnique({
    where: { id: idNum },
  });

  if (!q) {
    redirect("/admin/questions");
  }

  const error = searchParams?.error ? decodeURIComponent(searchParams.error) : undefined;

  return (
    <AdminQuestionForm
      mode="edit"
      questionId={q.id}
      action={updatePracticeQuestionAction}
      error={error}
      initialValues={{
        slug: q.slug,
        text: q.text,
        category: q.category,
        difficulty: q.difficulty,
        estimatedTime: q.estimatedTime ?? "5 min",
        tags: q.tags.join(", "),
        hint: q.hint ?? "",
        sampleAnswer: q.sampleAnswer ?? "",
      }}
    />
  );
}

