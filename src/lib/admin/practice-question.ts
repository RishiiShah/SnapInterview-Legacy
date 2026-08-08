import { z } from "zod/v4";

import {
  INTERVIEW_DIFFICULTY_VALUES,
  QUESTION_CATEGORY_VALUES,
} from "@/lib/interview/domain";

const practiceQuestionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens"),
  text: z.string().trim().min(1, "Question text is required"),
  category: z.enum(QUESTION_CATEGORY_VALUES),
  difficulty: z.enum(INTERVIEW_DIFFICULTY_VALUES),
  estimatedTime: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  hint: z.string().trim().optional(),
  sampleAnswer: z.string().trim().optional(),
});

export type PracticeQuestionFormData = z.infer<typeof practiceQuestionSchema>;

export function slugifyQuestionTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function parseTags(raw: string | null) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTags(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return parseTags(raw);
  }
  return [];
}

export function parsePracticeQuestionInput(input: {
  slug?: unknown;
  text?: unknown;
  category?: unknown;
  difficulty?: unknown;
  estimatedTime?: unknown;
  tags?: unknown;
  hint?: unknown;
  sampleAnswer?: unknown;
}) {
  const rawText = String(input.text ?? "");
  const rawSlug = String(input.slug ?? "").trim();

  const result = practiceQuestionSchema.safeParse({
    slug: rawSlug || slugifyQuestionTitle(rawText),
    text: rawText,
    category: String(input.category ?? ""),
    difficulty: String(input.difficulty ?? ""),
    estimatedTime: String(input.estimatedTime ?? "").trim() || undefined,
    tags: normalizeTags(input.tags),
    hint: String(input.hint ?? "").trim() || undefined,
    sampleAnswer: String(input.sampleAnswer ?? "").trim() || undefined,
  });

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(", ");
    return { success: false as const, error: message };
  }

  return {
    success: true as const,
    data: {
      ...result.data,
      estimatedTime: result.data.estimatedTime ?? null,
      hint: result.data.hint ?? null,
      sampleAnswer: result.data.sampleAnswer ?? null,
    },
  };
}

export function parsePracticeQuestionForm(formData: FormData) {
  return parsePracticeQuestionInput({
    slug: formData.get("slug"),
    text: formData.get("text"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty"),
    estimatedTime: formData.get("estimatedTime"),
    tags: parseTags(formData.get("tags") as string | null),
    hint: formData.get("hint"),
    sampleAnswer: formData.get("sampleAnswer"),
  });
}
