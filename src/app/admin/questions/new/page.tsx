import { AdminQuestionForm } from "@/components/admin/AdminQuestionForm";
import { createPracticeQuestionAction } from "../actions";

export default function AdminQuestionsNewPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error ? decodeURIComponent(searchParams.error) : undefined;

  return (
    <AdminQuestionForm mode="create" action={createPracticeQuestionAction} error={error} />
  );
}

