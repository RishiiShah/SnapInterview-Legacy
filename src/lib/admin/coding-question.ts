import { z } from "zod";

import { slugifyQuestionTitle } from "@/lib/admin/practice-question";
import {
  CODING_CONCEPT_LIMITS,
  CodingEstimatedTimeSchema,
  CodingPublicSampleExpectedOutputSchema,
  CodingPublicSampleInputSchema,
  CodingTopicSchema,
  JavaScriptPreviewSourceSchema,
} from "@/lib/coding/contracts";

const starterCodeSchema = z.object({
  javascript: z.string().trim().optional(),
}).strict();

const testcaseSchema = z.object({
  input: CodingPublicSampleInputSchema,
  expectedOutput: CodingPublicSampleExpectedOutputSchema,
});

const codingQuestionFormSchema = z.object({
  slug: z.string().trim().max(160),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim(),
  constraints: z.string().trim(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topics: z.array(CodingTopicSchema).max(CODING_CONCEPT_LIMITS.topicCount),
  estimatedTime: CodingEstimatedTimeSchema,
  hint: z.string().trim(),
  starterCode: starterCodeSchema,
  testCases: z.array(testcaseSchema).max(100),
  isPublished: z.boolean(),
}).superRefine((value, context) => {
  if (!value.isPublished) return;
  if (!value.description) context.addIssue({ code: "custom", message: "Description is required before publishing." });
  if (!JavaScriptPreviewSourceSchema.safeParse(value.starterCode.javascript).success) {
    context.addIssue({ code: "custom", message: "JavaScript preview source is required before publishing." });
  }
  if (value.testCases.length === 0) {
    context.addIssue({ code: "custom", message: "At least one public sample case is required before publishing." });
  }
});

function parseJson(raw: FormDataEntryValue | null, fallback: unknown) {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parseStarterCode(raw: FormDataEntryValue | null) {
  const parsed = parseJson(raw, {});
  if (typeof parsed !== "object" || parsed === null) return {};

  const javascript = (parsed as Record<string, unknown>).javascript;
  return typeof javascript === "string" ? { javascript } : {};
}

function parseTopics(raw: FormDataEntryValue | null) {
  return typeof raw === "string"
    ? raw.split(",").map((topic) => topic.trim()).filter(Boolean)
    : [];
}

export function parseCodingQuestionForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const parsed = codingQuestionFormSchema.safeParse({
    slug: String(formData.get("slug") ?? "").trim() || slugifyQuestionTitle(title),
    title,
    description: String(formData.get("description") ?? "").trim(),
    constraints: String(formData.get("constraints") ?? "").trim(),
    difficulty: String(formData.get("difficulty") ?? ""),
    topics: parseTopics(formData.get("topics")),
    estimatedTime: String(formData.get("estimatedTime") ?? "").trim(),
    hint: String(formData.get("hint") ?? "").trim(),
    starterCode: parseStarterCode(formData.get("starterCode")),
    testCases: parseJson(formData.get("testCases"), []),
    isPublished: formData.getAll("isPublished").some((value) => value === "true"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid coding question." };
  }

  return {
    success: true as const,
    data: {
      ...parsed.data,
      constraints: parsed.data.constraints || null,
      estimatedTime: parsed.data.estimatedTime || null,
      hint: parsed.data.hint || null,
      starterCode: Object.fromEntries(Object.entries(parsed.data.starterCode).filter(([, source]) => source)),
    },
  };
}
