import { z } from "zod/v4";

import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_DURATION_VALUES,
  INTERVIEW_LEVEL_VALUES,
  INTERVIEW_TYPE_VALUES,
} from "@/lib/interview/domain";
import { PLAN_STAGES } from "@/lib/plans/graph";

const textList = z.array(z.string().trim().min(1).max(160)).max(24);

export const loopRubricDimensionSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  weight: z.number().positive().max(1),
  description: z.string().trim().min(1).max(500),
});

export const loopRoundSchema = z.object({
  round_key: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  stage: z.enum(PLAN_STAGES),
  interview_type: z.enum(INTERVIEW_TYPE_VALUES),
  duration_minutes: z.union(INTERVIEW_DURATION_VALUES.map((value) => z.literal(value))),
  difficulty_by_level: z.partialRecord(z.enum(INTERVIEW_LEVEL_VALUES), z.enum(INTERVIEW_DIFFICULTY_VALUES)),
  included_levels: z.array(z.enum(INTERVIEW_LEVEL_VALUES)).min(1),
  purpose: z.string().trim().min(1).max(500),
  competencies: textList.min(1),
  question_strategy: z.object({
    preferred_categories: textList,
    required_tags: textList,
    preferred_tags: textList,
    excluded_tags: textList,
    company_theme_ids: textList,
    avoid_plan_question_repeats: z.boolean(),
  }),
  rubric_key: z.string().trim().min(1).max(100),
  rubric_dimensions: z.array(loopRubricDimensionSchema).min(1).max(12),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
});

export const interviewLoopBlueprintSchema = z.object({
  key: z.string().trim().min(1).max(100),
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  match_scope: z.enum(["exact", "role_family", "general"]),
  company_keys: textList,
  role_slugs: textList,
  role_families: textList,
  supported_levels: z.array(z.enum(INTERVIEW_LEVEL_VALUES)).min(1),
  reviewed_at: z.iso.date(),
  sources_note: z.string().trim().min(1).max(1000),
  rounds: z.array(loopRoundSchema).min(1).max(20),
}).superRefine((blueprint, ctx) => {
  const roundKeys = new Set<string>();
  for (const [index, round] of blueprint.rounds.entries()) {
    if (roundKeys.has(round.round_key)) {
      ctx.addIssue({ code: "custom", path: ["rounds", index, "round_key"], message: "Round keys must be unique" });
    }
    roundKeys.add(round.round_key);
    const weight = round.rubric_dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    if (Math.abs(weight - 1) > 0.001) {
      ctx.addIssue({ code: "custom", path: ["rounds", index, "rubric_dimensions"], message: "Rubric weights must total 1" });
    }
    for (const level of round.included_levels) {
      if (!round.difficulty_by_level[level]) {
        ctx.addIssue({ code: "custom", path: ["rounds", index, "difficulty_by_level"], message: `Missing difficulty for ${level}` });
      }
    }
  }
});

export type InterviewLoopBlueprint = z.infer<typeof interviewLoopBlueprintSchema>;
export type InterviewLoopRound = z.infer<typeof loopRoundSchema>;
