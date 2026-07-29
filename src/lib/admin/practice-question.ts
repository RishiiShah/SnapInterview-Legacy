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
  type: z.enum(["text", "coding"]).default("text"),
  description: z.string().trim().optional(),
  constraints: z.string().trim().optional(),
  starterCode: z.record(z.string(), z.string()).optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().default(false),
      })
    )
    .optional(),
  solutionCode: z.record(z.string(), z.string()).optional(),
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
  type?: unknown;
  description?: unknown;
  constraints?: unknown;
  starterCode?: unknown;
  testCases?: unknown;
  solutionCode?: unknown;
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
    type: String(input.type ?? "text"),
    description: input.description ? String(input.description).trim() || undefined : undefined,
    constraints: input.constraints ? String(input.constraints).trim() || undefined : undefined,
    starterCode: input.starterCode && typeof input.starterCode === "object" ? input.starterCode : undefined,
    testCases: Array.isArray(input.testCases) ? input.testCases : undefined,
    solutionCode: input.solutionCode && typeof input.solutionCode === "object" ? input.solutionCode : undefined,
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
      description: result.data.description ?? null,
      constraints: result.data.constraints ?? null,
      starterCode: result.data.starterCode ?? undefined,
      testCases: result.data.testCases ?? undefined,
      solutionCode: result.data.solutionCode ?? undefined,
    },
  };
}

export function parsePracticeQuestionForm(formData: FormData) {
  const type = (formData.get("type") as string) || "text";

  let starterCode: Record<string, string> | undefined;
  let testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }> | undefined;
  let solutionCode: Record<string, string> | undefined;

  if (type === "coding") {
    const starterCodeRaw = formData.get("starterCode") as string | null;
    const testCasesRaw = formData.get("testCases") as string | null;
    const solutionCodeRaw = formData.get("solutionCode") as string | null;

    try { starterCode = starterCodeRaw ? JSON.parse(starterCodeRaw) : undefined; } catch { /* ignore */ }
    try { testCases = testCasesRaw ? JSON.parse(testCasesRaw) : undefined; } catch { /* ignore */ }
    try { solutionCode = solutionCodeRaw ? JSON.parse(solutionCodeRaw) : undefined; } catch { /* ignore */ }
  }

  return parsePracticeQuestionInput({
    slug: formData.get("slug"),
    text: formData.get("text"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty"),
    estimatedTime: formData.get("estimatedTime"),
    tags: parseTags(formData.get("tags") as string | null),
    hint: formData.get("hint"),
    sampleAnswer: formData.get("sampleAnswer"),
    type,
    description: formData.get("description"),
    constraints: formData.get("constraints"),
    starterCode,
    testCases,
    solutionCode,
  });
}
