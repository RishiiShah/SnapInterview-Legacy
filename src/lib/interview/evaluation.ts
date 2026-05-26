import { z } from "zod/v4";

const nonEmptyTrimmedString = z.string().trim().min(1);

export const transcriptEvaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: nonEmptyTrimmedString,
  strengths: z.array(nonEmptyTrimmedString).max(4).default([]),
  areasForImprovement: z.array(nonEmptyTrimmedString).max(4).default([]),
  // Sub-scores — optional for backwards compatibility with existing DB records
  communication: z.number().int().min(0).max(100).optional(),
  technicalDepth: z.number().int().min(0).max(100).optional(),
  clarity: z.number().int().min(0).max(100).optional(),
});

export const questionEvaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: nonEmptyTrimmedString,
});

export type TranscriptEvaluationResponse = z.infer<typeof transcriptEvaluationResponseSchema>;
export type QuestionEvaluationResponse = z.infer<typeof questionEvaluationResponseSchema>;

function extractJsonObjectCandidate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty model response");
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function parseTranscriptEvaluationResponse(raw: string): TranscriptEvaluationResponse {
  return transcriptEvaluationResponseSchema.parse(JSON.parse(extractJsonObjectCandidate(raw)));
}

export function parseQuestionEvaluationResponse(raw: string): QuestionEvaluationResponse {
  return questionEvaluationResponseSchema.parse(JSON.parse(extractJsonObjectCandidate(raw)));
}

export function normalizeTranscriptEvaluation(
  value: unknown,
): TranscriptEvaluationResponse | null {
  const parsed = transcriptEvaluationResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function normalizeQuestionEvaluation(
  value: unknown,
): QuestionEvaluationResponse | null {
  const parsed = questionEvaluationResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
