"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { parseCodingQuestionForm } from "@/lib/admin/coding-question";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { CODING_CATALOG_CACHE_TAG } from "@/repositories/coding-question-repo";

function redirectWithError(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }

function isCodingSlugConflict(error: unknown) {
  const knownError = error as { code?: unknown; meta?: { target?: unknown } } | null;
  if (knownError?.code !== "P2002") return false;

  const target = knownError.meta?.target;
  const fields = Array.isArray(target) ? target : [target];
  return fields.some(
    (field) => typeof field === "string" && field.toLowerCase().includes("slug"),
  );
}

export async function createCodingQuestionAction(formData: FormData) {
  await requireAdminSession();
  const parsed = parseCodingQuestionForm(formData);
  if (!parsed.success) redirectWithError("/admin/coding/new", parsed.error);
  const { testCases, ...questionData } = parsed.data;
  try {
    await prisma.codingQuestion.create({
      data: {
        ...questionData,
        testCases: {
          create: testCases.map((testCase, index) => ({
            ...testCase,
            isHidden: false,
            ordinal: index + 1,
          })),
        },
      },
    });
  } catch (error) {
    if (isCodingSlugConflict(error)) {
      redirectWithError("/admin/coding/new", "A coding problem with this slug already exists.");
    }
    throw error;
  }
  revalidateTag(CODING_CATALOG_CACHE_TAG, "max");
  revalidatePath("/admin/coding"); revalidatePath("/coding"); redirect("/admin/coding");
}

export async function updateCodingQuestionAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("questionId") ?? "");
  if (!id) redirectWithError("/admin/coding", "Invalid coding problem id.");
  const parsed = parseCodingQuestionForm(formData);
  if (!parsed.success) redirectWithError(`/admin/coding/${id}/edit`, parsed.error);
  const { testCases, ...questionData } = parsed.data;
  const existing = await prisma.codingQuestion.findUnique({ where: { id }, select: { id: true } });
  if (!existing) redirectWithError("/admin/coding", "Coding problem not found.");
  const conflict = await prisma.codingQuestion.findFirst({ where: { slug: parsed.data.slug, NOT: { id } }, select: { id: true } });
  if (conflict) redirectWithError(`/admin/coding/${id}/edit`, "A coding problem with this slug already exists.");
  await prisma.$transaction(async (tx) => {
    await tx.codingQuestion.update({ where: { id }, data: questionData });
    await tx.codingTestCase.deleteMany({ where: { questionId: id, isHidden: false } });
    const hiddenCases = await tx.codingTestCase.aggregate({ where: { questionId: id, isHidden: true }, _max: { ordinal: true } });
    const firstPublicOrdinal = (hiddenCases._max.ordinal ?? 0) + 1;
    if (testCases.length) await tx.codingTestCase.createMany({ data: testCases.map((testCase, index) => ({ ...testCase, isHidden: false, questionId: id, ordinal: firstPublicOrdinal + index })) });
  });
  revalidateTag(CODING_CATALOG_CACHE_TAG, "max");
  revalidatePath("/admin/coding"); revalidatePath(`/admin/coding/${id}/edit`); revalidatePath("/coding"); redirect("/admin/coding");
}
