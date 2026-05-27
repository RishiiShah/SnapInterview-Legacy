import { z } from "zod/v4";

import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_TYPE_VALUES,
} from "@/lib/interview/domain";

const practiceQuestionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens"),
  text: z.string().trim().min(1, "Question text is required"),
  category: z.enum(INTERVIEW_TYPE_VALUES),
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

export function parsePracticeQuestionForm(formData: FormData) {
  const slugInput = String(formData.get("slug") ?? "").trim();
  const text = String(formData.get("text") ?? "");

  const slug = slugInput || slugifyQuestionTitle(text);

  const result = practiceQuestionSchema.safeParse({
    slug,
    text,
    category: String(formData.get("category") ?? ""),
    difficulty: String(formData.get("difficulty") ?? ""),
    estimatedTime: String(formData.get("estimatedTime") ?? "").trim() || undefined,
    tags: parseTags(formData.get("tags") as string | null),
    hint: String(formData.get("hint") ?? "").trim() || undefined,
    sampleAnswer: String(formData.get("sampleAnswer") ?? "").trim() || undefined,
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
