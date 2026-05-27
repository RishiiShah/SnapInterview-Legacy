"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { parsePracticeQuestionForm } from "@/lib/admin/practice-question";
import { prisma } from "@/lib/prisma";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createPracticeQuestionAction(formData: FormData) {
  await requireAdminSession();

  const parsed = parsePracticeQuestionForm(formData);
  if (!parsed.success) {
    redirectWithError("/admin/questions/new", parsed.error);
  }

  const existing = await prisma.practiceQuestion.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    redirectWithError("/admin/questions/new", "A question with this slug already exists.");
  }

  await prisma.practiceQuestion.create({ data: parsed.data });

  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}

export async function updatePracticeQuestionAction(formData: FormData) {
  await requireAdminSession();

  const id = Number(formData.get("questionId"));
  if (!Number.isFinite(id)) {
    redirectWithError("/admin/questions", "Invalid question id.");
  }

  const parsed = parsePracticeQuestionForm(formData);
  if (!parsed.success) {
    redirectWithError(`/admin/questions/${id}/edit`, parsed.error);
  }

  const existing = await prisma.practiceQuestion.findUnique({ where: { id } });
  if (!existing) {
    redirectWithError("/admin/questions", "Question not found.");
  }

  const slugConflict = await prisma.practiceQuestion.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (slugConflict) {
    redirectWithError(`/admin/questions/${id}/edit`, "A question with this slug already exists.");
  }

  await prisma.practiceQuestion.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}/edit`);
  redirect("/admin/questions");
}

export async function deletePracticeQuestionAction(formData: FormData) {
  await requireAdminSession();

  const id = Number(formData.get("questionId"));
  if (!Number.isFinite(id)) return;

  await prisma.practiceQuestion.delete({ where: { id } });

  revalidatePath("/admin/questions");
}
