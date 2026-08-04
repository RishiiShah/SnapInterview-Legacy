import { AdminCodingForm } from "@/components/admin/AdminCodingForm";
import { createCodingQuestionAction } from "../actions";

export default async function NewCodingProblemPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AdminCodingForm mode="create" action={createCodingQuestionAction} error={error} />;
}
