import { AdminQuestionForm } from "@/components/admin/AdminQuestionForm";
import { createPracticeQuestionAction } from "../actions";

export default async function AdminQuestionsNewPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const error = sp?.error ? decodeURIComponent(sp.error) : undefined;

  return (
    <AdminQuestionForm mode="create" action={createPracticeQuestionAction} error={error} />
  );
}

