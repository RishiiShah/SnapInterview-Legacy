import { z } from "zod";

import { SupportedLanguageSchema } from "@/lib/coding/contracts";
import { slugifyQuestionTitle } from "@/lib/admin/practice-question";

const starterCodeSchema = z.object({
  javascript: z.string().trim().optional(),
  python: z.string().trim().optional(),
  cpp: z.string().trim().optional(),
}).strict();

const testcaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean().default(false),
});

const codingQuestionFormSchema = z.object({
  slug: z.string().trim().max(160),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim(),
  constraints: z.string().trim(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topics: z.array(z.string().trim().min(1)).max(20),
  estimatedTime: z.string().trim(),
  hint: z.string().trim(),
  starterCode: starterCodeSchema,
  solutionCode: z.record(SupportedLanguageSchema, z.string()).optional(),
  testCases: z.array(testcaseSchema).max(100),
  isPublished: z.boolean(),
}).superRefine((value, context) => {
  if (!value.isPublished) return;
  if (!value.description) context.addIssue({ code: "custom", message: "Description is required before publishing." });
  if (!Object.values(value.starterCode).some((source) => source && source.length > 0)) {
    context.addIssue({ code: "custom", message: "At least one starter language is required before publishing." });
  }
  if (value.testCases.length === 0) {
    context.addIssue({ code: "custom", message: "At least one testcase is required before publishing." });
  }
  if (!value.testCases.some((testCase) => !testCase.isHidden)) {
    context.addIssue({ code: "custom", message: "At least one public sample testcase is required before publishing." });
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
    starterCode: parseJson(formData.get("starterCode"), {}),
    solutionCode: parseJson(formData.get("solutionCode"), undefined),
    testCases: parseJson(formData.get("testCases"), []),
    isPublished: formData.get("isPublished") === "true",
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
      solutionCode: parsed.data.solutionCode && Object.keys(parsed.data.solutionCode).length > 0 ? parsed.data.solutionCode : null,
      starterCode: Object.fromEntries(Object.entries(parsed.data.starterCode).filter(([, source]) => source)),
    },
  };
}
