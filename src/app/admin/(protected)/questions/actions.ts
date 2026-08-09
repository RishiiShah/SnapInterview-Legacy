"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { ADMIN_QUESTION_FACETS_TAG } from "@/lib/admin/question-facets";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { parsePracticeQuestionForm, parsePracticeQuestionInput } from "@/lib/admin/practice-question";
import { prisma } from "@/lib/prisma";
import { PRACTICE_QUESTION_CATALOG_CACHE_TAG } from "@/repositories/question-repo";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

function revalidateQuestionFacets() {
  revalidateTag(ADMIN_QUESTION_FACETS_TAG, "max");
  revalidateTag(PRACTICE_QUESTION_CATALOG_CACHE_TAG, "max");
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

// Record-aware CSV tokenizer: walks the whole text so newlines inside quoted fields
// (e.g. multi-paragraph sample answers from our own CSV export) stay within the field
// instead of being split into bogus rows.
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else if (char !== "\r") {
      field += char;
    }
  }

  record.push(field);
  records.push(record);

  // Drop blank records (blank lines / a trailing newline yield a single empty field).
  return records.filter((cells) => !(cells.length === 1 && cells[0].trim() === ""));
}

function parseCsvQuestions(text: string) {
  const records = parseCsvRecords(text).map((cells) => cells.map((value) => value.trim()));

  if (records.length < 2) {
    return { success: false as const, error: "CSV must include a header and at least one row." };
  }

  const header = records[0].map((h) => h.toLowerCase());
  const required = ["text", "category", "difficulty"];
  const missing = required.filter((field) => !header.includes(field));
  if (missing.length > 0) {
    return { success: false as const, error: `CSV missing required columns: ${missing.join(", ")}` };
  }

  const rows = records.slice(1).map((cells, rowIndex) => {
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

function mergeQuestionTags(existing: string[], incoming: string[]) {
  const seen = new Set(existing);
  const merged = [...existing];
  for (const tag of incoming) {
    if (!seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }
  return merged;
}

export async function importPracticeQuestionsAction(formData: FormData) {
  await requireAdminSession();

  const file = formData.get("file");
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

  const { created, tagsMerged } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('"PracticeQuestion"', 'id'),
        (SELECT COALESCE(MAX(id), 0) + 1 FROM "PracticeQuestion"),
        false
      )
    `;

    let created = 0;
    let tagsMerged = 0;

    for (const item of normalized) {
      if (!item) continue;

      const existing = await tx.practiceQuestion.findUnique({
        where: { slug: item.slug },
        select: { id: true, tags: true },
      });

      if (existing) {
        const mergedTags = mergeQuestionTags(existing.tags, item.tags);
        if (mergedTags.length > existing.tags.length) {
          await tx.practiceQuestion.update({
            where: { id: existing.id },
            data: { tags: mergedTags },
          });
          tagsMerged += 1;
        }
        continue;
      }

      await tx.practiceQuestion.create({ data: item });
      created += 1;
    }

    return { created, tagsMerged };
  });

  revalidatePath("/admin/questions");
  revalidateQuestionFacets();
  const parts = [`created ${created}`];
  if (tagsMerged > 0) {
    parts.push(`merged tags on ${tagsMerged} existing question${tagsMerged === 1 ? "" : "s"}`);
  }
  redirectWithMessage("/admin/questions", `Import complete: ${parts.join(", ")}.`);
}
