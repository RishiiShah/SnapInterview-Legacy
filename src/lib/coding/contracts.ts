import { z } from "zod";

export const SupportedLanguageSchema = z.enum(["javascript", "python", "cpp"]);

export const CodingStarterCodeSchema = z
  .object({
    javascript: z.string().trim().min(1).optional(),
    python: z.string().trim().min(1).optional(),
    cpp: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some(Boolean), {
    message: "At least one starter language is required.",
  });

export const CodingSampleTestCaseSchema = z.object({
  ordinal: z.number().int().positive(),
  input: z.string().max(50_000),
  expectedOutput: z.string().max(50_000),
});

export const CodingQuestionSchema = z.object({
  id: z.string(),
  slug: z.string().min(1).max(160),
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  constraints: z.string().nullable(),
  difficulty: z.string().min(1).max(48),
  topics: z.array(z.string().min(1).max(80)).max(20),
  estimatedTime: z.string().max(48).nullable(),
  hint: z.string().nullable(),
  starterCode: CodingStarterCodeSchema,
  sampleTestCases: z.array(CodingSampleTestCaseSchema).min(1),
  solved: z.boolean(),
});

export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;
export type CodingStarterCode = z.infer<typeof CodingStarterCodeSchema>;
export type CodingSampleTestCase = z.infer<typeof CodingSampleTestCaseSchema>;
export type CodingWorkspaceQuestion = z.infer<typeof CodingQuestionSchema>;
