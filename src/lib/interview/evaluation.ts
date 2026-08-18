import { z } from "zod/v4";
import type { InterviewType } from "./domain";

const nonEmptyTrimmedString = z.string().trim().min(1);

export const hireVerdictSchema = z.enum([
  "strong_hire",
  "hire",
  "lean_hire",
  "lean_no_hire",
  "no_hire",
]);
export type HireVerdict = z.infer<typeof hireVerdictSchema>;

export const estimatedLevelSchema = z.enum([
  "entry-level",
  "mid-level",
  "senior",
  "staff-plus",
  "not-levelable",
]);
export type EstimatedLevel = z.infer<typeof estimatedLevelSchema>;

export const evidenceCitationSchema = z.object({
  turnOrder: z.number().int().optional(),
  quoteOrTopic: nonEmptyTrimmedString,
  note: nonEmptyTrimmedString,
});
export type EvidenceCitation = z.infer<typeof evidenceCitationSchema>;

export const scorecardDimensionSchema = z.object({
  key: nonEmptyTrimmedString,
  label: nonEmptyTrimmedString,
  score: z.number().int().min(0).max(100),
  weight: z.number().min(0).max(1),
  summary: nonEmptyTrimmedString,
  strengths: z.array(nonEmptyTrimmedString).default([]),
  growthAreas: z.array(nonEmptyTrimmedString).default([]),
  evidenceCitations: z.array(evidenceCitationSchema).default([]),
});
export type ScorecardDimension = z.infer<typeof scorecardDimensionSchema>;

export const briefPillarCoverageSchema = z.object({
  pillarId: nonEmptyTrimmedString,
  pillarTitle: nonEmptyTrimmedString,
  covered: z.boolean(),
  notes: z.string().optional(),
});
export type BriefPillarCoverage = z.infer<typeof briefPillarCoverageSchema>;

export const transcriptEvaluationV2Schema = z.object({
  version: z.literal(2).default(2),
  overallScore: z.number().int().min(0).max(100),
  verdict: hireVerdictSchema,
  estimatedLevel: z.union([
    estimatedLevelSchema,
    z.enum(["L3 / Junior", "L4 / Mid", "L5 / Senior", "L6 / Staff+", "Not Levelable"]),
  ]),
  levelRationale: nonEmptyTrimmedString,
  companySignals: z
    .object({
      matchedCompanyPack: z.string().optional(),
      methodNotes: z.string().optional(),
    })
    .default({}),
  dimensions: z.array(scorecardDimensionSchema),
  briefPillarCoverage: z.array(briefPillarCoverageSchema).default([]),
  executiveSummary: nonEmptyTrimmedString,
  keyStrengths: z.array(nonEmptyTrimmedString).max(6).default([]),
  criticalGaps: z.array(nonEmptyTrimmedString).max(6).default([]),
  recommendedPreparation: z.array(nonEmptyTrimmedString).max(6).default([]),
});
export type TranscriptEvaluationV2 = z.infer<typeof transcriptEvaluationV2Schema>;

export const transcriptEvaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: nonEmptyTrimmedString,
  strengths: z.array(nonEmptyTrimmedString).max(6).default([]),
  areasForImprovement: z.array(nonEmptyTrimmedString).max(6).default([]),
  // Sub-scores for legacy backwards compatibility
  communication: z.number().int().min(0).max(100).optional(),
  technicalDepth: z.number().int().min(0).max(100).optional(),
  clarity: z.number().int().min(0).max(100).optional(),
  // Complete V2 evaluation payload
  v2: transcriptEvaluationV2Schema.optional(),
});

export const questionEvaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: nonEmptyTrimmedString,
});

export type TranscriptEvaluationResponse = z.infer<typeof transcriptEvaluationResponseSchema>;
export type QuestionEvaluationResponse = z.infer<typeof questionEvaluationResponseSchema>;

/**
 * Returns the target dimensions and weights for a given interview type.
 */
export function getScorecardDimensionsForType(type: InterviewType): Array<{
  key: string;
  label: string;
  weight: number;
  description: string;
}> {
  const baseCore = [
    {
      key: "problemFraming",
      label: "Problem Framing & Scope Definition",
      weight: 0.15,
      description: "Requirements disambiguation, boundary conditions, and structured approach before solutioning.",
    },
    {
      key: "structuredCommunication",
      label: "Structured Communication & Clarity",
      weight: 0.15,
      description: "Top-down communication, conciseness, structured taxonomy, and clarity of thought.",
    },
    {
      key: "depthUnderFollowups",
      label: "Technical Depth Under Follow-ups",
      weight: 0.20,
      description: "Handling complex probes, concurrency, latency trade-offs, and failure mode analysis.",
    },
    {
      key: "evidenceSpecificity",
      label: "Evidence Specificity & Concrete Claims",
      weight: 0.15,
      description: "Backing claims with specific production patterns, data models, metrics, or technologies.",
    },
    {
      key: "roleJdFit",
      label: "Role & Domain Competency",
      weight: 0.20,
      description: "Direct alignment with target role expectations and domain best practices.",
    },
  ];

  if (type === "system-design") {
    return [
      ...baseCore,
      {
        key: "whiteboardClarityAndDecomposition",
        label: "Whiteboard Clarity & Architecture Decomposition",
        weight: 0.15,
        description: "Clarity of component boundaries, data flow directions, storage choices, and caching layers.",
      },
    ];
  }

  if (type === "coding-algorithms") {
    return [
      ...baseCore,
      {
        key: "codeCorrectnessAndComplexity",
        label: "Code Correctness, Edge Cases & Complexity",
        weight: 0.15,
        description: "Algorithmic accuracy, space/time complexity bounds, and exhaustive edge-case handling.",
      },
    ];
  }

  if (type === "behavioral-leadership" || type === "hiring-manager" || type === "bar-raiser") {
    return [
      ...baseCore,
      {
        key: "ownershipAndLeadership",
        label: "Ownership, Influence & Conflict Resolution",
        weight: 0.15,
        description: "Driving cross-functional alignment, taking responsibility for failures, and principled decision-making.",
      },
    ];
  }

  // For recruiter-screen, take-home, domain-role: normalize 5 core to equal weights summing to 1.0
  return [
    { ...baseCore[0], weight: 0.20 },
    { ...baseCore[1], weight: 0.20 },
    { ...baseCore[2], weight: 0.20 },
    { ...baseCore[3], weight: 0.20 },
    { ...baseCore[4], weight: 0.20 },
  ];
}

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
  const candidate = JSON.parse(extractJsonObjectCandidate(raw));

  // If payload is a direct V2 evaluation object
  if (candidate && candidate.version === 2 && Array.isArray(candidate.dimensions)) {
    const v2 = transcriptEvaluationV2Schema.parse(candidate);
    const commDim = v2.dimensions.find((d) => d.key === "structuredCommunication" || d.key === "communication");
    const techDim = v2.dimensions.find((d) => d.key === "depthUnderFollowups" || d.key === "technical_depth");
    const problemDim = v2.dimensions.find((d) => d.key === "problemFraming" || d.key === "problem_solving");

    return {
      score: v2.overallScore,
      feedback: v2.executiveSummary,
      strengths: v2.keyStrengths,
      areasForImprovement: v2.criticalGaps,
      communication: commDim ? commDim.score : undefined,
      technicalDepth: techDim ? techDim.score : undefined,
      clarity: problemDim ? problemDim.score : undefined,
      v2,
    };
  }

  return transcriptEvaluationResponseSchema.parse(candidate);
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
