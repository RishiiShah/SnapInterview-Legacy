import { notFound } from "next/navigation";

import { AdminCodingForm } from "@/components/admin/AdminCodingForm";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { updateCodingQuestionAction } from "../../actions";

export default async function EditCodingProblemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdminSession();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const question = await prisma.codingQuestion.findUnique({ where: { id }, include: { testCases: { where: { isHidden: false }, orderBy: { ordinal: "asc" } } } });
  if (!question) notFound();
  return <AdminCodingForm mode="edit" questionId={question.id} action={updateCodingQuestionAction} error={error} initialValues={{ slug: question.slug, title: question.title, description: question.description, constraints: question.constraints ?? "", difficulty: question.difficulty, topics: question.topics.join(", "), estimatedTime: question.estimatedTime ?? "", hint: question.hint ?? "", starterCode: question.starterCode as Record<string, string>, testCases: question.testCases.map(({ input, expectedOutput }) => ({ input, expectedOutput })), isPublished: question.isPublished }} />;
}
