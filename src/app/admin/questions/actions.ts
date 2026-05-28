"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { ADMIN_QUESTION_FACETS_TAG } from "@/lib/admin/question-facets";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { parsePracticeQuestionForm, parsePracticeQuestionInput } from "@/lib/admin/practice-question";
import { prisma } from "@/lib/prisma";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

function revalidateQuestionFacets() {
  revalidateTag(ADMIN_QUESTION_FACETS_TAG, "max");
}

async function ensurePracticeQuestionIdSequence() {
  await prisma.$executeRaw`
    SELECT setval(
      pg_get_serial_sequence('"PracticeQuestion"', 'id'),
      (SELECT COALESCE(MAX(id), 0) + 1 FROM "PracticeQuestion"),
      false
    )
  `;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let curr = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      curr += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(curr);
      curr = "";
      continue;
    }

    curr += char;
  }

  out.push(curr);
  return out.map((value) => value.trim());
}

function parseCsvQuestions(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { success: false as const, error: "CSV must include a header and at least one row." };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const required = ["text", "category", "difficulty"];
  const missing = required.filter((field) => !header.includes(field));
  if (missing.length > 0) {
    return { success: false as const, error: `CSV missing required columns: ${missing.join(", ")}` };
  }

  const rows = lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line);
    const record: Record<string, string> = {};
    header.forEach((h, idx) => {
      record[h] = cells[idx] ?? "";
    });

    return {
      line: rowIndex + 2,
      input: {
        slug: record.slug,
        text: record.text,
        category: record.category,
        difficulty: record.difficulty,
        estimatedTime: record.estimatedtime,
        tags: record.tags,
        hint: record.hint,
        sampleAnswer: record.sampleanswer,
      },
    };
  });

  return { success: true as const, rows };
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

  try {
    await prisma.practiceQuestion.create({ data: parsed.data });
  } catch (err) {
    // If the DB sequence for PracticeQuestion.id is out of sync (common after manual inserts),
    // repair it and retry once.
    const maybeKnown = err as { code?: string; meta?: unknown } | null;
    const isUniqueViolation = maybeKnown?.code === "P2002";

    if (!isUniqueViolation) {
      throw err;
    }

    await ensurePracticeQuestionIdSequence();
    await prisma.practiceQuestion.create({ data: parsed.data });
  }

  revalidatePath("/admin/questions");
  revalidateQuestionFacets();
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
  revalidateQuestionFacets();
  redirect("/admin/questions");
}

export async function deletePracticeQuestionAction(formData: FormData) {
  await requireAdminSession();

  const id = Number(formData.get("questionId"));
  if (!Number.isFinite(id)) return;

  await prisma.practiceQuestion.delete({ where: { id } });

  revalidatePath("/admin/questions");
  revalidateQuestionFacets();
}

export async function importPracticeQuestionsAction(formData: FormData) {
  await requireAdminSession();

  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "skip");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError("/admin/questions", "Please choose a non-empty file.");
  }

  const filename = file.name.toLowerCase();
  const format = filename.endsWith(".json") ? "json" : filename.endsWith(".csv") ? "csv" : "";
  if (!format) {
    redirectWithError("/admin/questions", "Unsupported file type. Use .csv or .json.");
  }

  const text = await file.text();
  let records: Array<{ line: number; input: Record<string, unknown> }> = [];

  if (format === "json") {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      redirectWithError("/admin/questions", "Invalid JSON file.");
    }

    if (!Array.isArray(parsedJson)) {
      redirectWithError("/admin/questions", "JSON import expects an array of question objects.");
    }

    records = parsedJson.map((entry, idx) => ({
      line: idx + 1,
      input: (entry ?? {}) as Record<string, unknown>,
    }));
  } else {
    const parsedCsv = parseCsvQuestions(text);
    if (!parsedCsv.success) {
      redirectWithError("/admin/questions", parsedCsv.error);
    }
    records = parsedCsv.rows;
  }

  if (records.length === 0) {
    redirectWithError("/admin/questions", "No records found to import.");
  }

  const validationErrors: string[] = [];
  const normalized = records.map((record) => {
    const parsed = parsePracticeQuestionInput({
      slug: record.input.slug,
      text: record.input.text,
      category: record.input.category,
      difficulty: record.input.difficulty,
      estimatedTime: record.input.estimatedTime,
      tags: record.input.tags,
      hint: record.input.hint,
      sampleAnswer: record.input.sampleAnswer,
    });

    if (!parsed.success) {
      validationErrors.push(`Line ${record.line}: ${parsed.error}`);
      return null;
    }

    return parsed.data;
  });

  if (validationErrors.length > 0) {
    redirectWithError(
      "/admin/questions",
      `Import failed. ${validationErrors.slice(0, 5).join(" | ")}${validationErrors.length > 5 ? " ..." : ""}`,
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  await ensurePracticeQuestionIdSequence();
  for (const item of normalized) {
    if (!item) continue;
    if (mode === "upsert") {
      const existed = await prisma.practiceQuestion.findUnique({ where: { slug: item.slug }, select: { id: true } });
      await prisma.practiceQuestion.upsert({
        where: { slug: item.slug },
        update: item,
        create: item,
      });
      if (existed) updated += 1;
      else created += 1;
      continue;
    }

    const existing = await prisma.practiceQuestion.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.practiceQuestion.create({ data: item });
    created += 1;
  }

  revalidatePath("/admin/questions");
  revalidateQuestionFacets();
  redirectWithMessage(
    "/admin/questions",
    `Import complete: created ${created}, updated ${updated}, skipped ${skipped}.`,
  );
}
