import { z } from "zod";

export const SupportedLanguageSchema = z.literal("javascript");

export const CODING_CONCEPT_LIMITS = {
  topicCount: 20,
  topicLength: 80,
  estimatedTimeLength: 48,
  publicSampleValueLength: 50_000,
} as const;

export const JavaScriptPreviewSourceSchema = z
  .string()
  .trim()
  .min(1, "JavaScript preview source is required.");

export const CodingTopicSchema = z
  .string()
  .trim()
  .min(1, "Topic is required.")
  .max(CODING_CONCEPT_LIMITS.topicLength, "Topic must be at most 80 characters.");

export const CodingEstimatedTimeSchema = z
  .string()
  .trim()
  .max(CODING_CONCEPT_LIMITS.estimatedTimeLength, "Estimated time must be at most 48 characters.");

export const CodingPublicSampleInputSchema = z
  .string()
  .max(CODING_CONCEPT_LIMITS.publicSampleValueLength, "Public sample input must be at most 50,000 characters.");

export const CodingPublicSampleExpectedOutputSchema = z
  .string()
  .max(CODING_CONCEPT_LIMITS.publicSampleValueLength, "Public sample expected output must be at most 50,000 characters.");

export const CodingStarterCodeSchema = z
  .object({
    javascript: JavaScriptPreviewSourceSchema,
  })
  .strict();

export const CodingSampleTestCaseSchema = z.object({
  ordinal: z.number().int().positive(),
  input: CodingPublicSampleInputSchema,
  expectedOutput: CodingPublicSampleExpectedOutputSchema,
});

export const CodingQuestionSchema = z.object({
  id: z.string(),
  slug: z.string().min(1).max(160),
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  constraints: z.string().nullable(),
  difficulty: z.string().min(1).max(48),
  topics: z.array(CodingTopicSchema).max(CODING_CONCEPT_LIMITS.topicCount),
  estimatedTime: CodingEstimatedTimeSchema.nullable(),
  hint: z.string().nullable(),
  starterCode: CodingStarterCodeSchema,
  sampleTestCases: z.array(CodingSampleTestCaseSchema).min(1),
});

export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;
export type CodingStarterCode = z.infer<typeof CodingStarterCodeSchema>;
export type CodingSampleTestCase = z.infer<typeof CodingSampleTestCaseSchema>;
export type CodingWorkspaceQuestion = z.infer<typeof CodingQuestionSchema>;
