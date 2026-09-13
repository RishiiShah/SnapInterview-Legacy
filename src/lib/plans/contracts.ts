import { z } from "zod/v4";

import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_DURATION_VALUES,
  INTERVIEW_LEVEL_VALUES,
  INTERVIEW_TYPE_VALUES,
} from "@/lib/interview/domain";
import {
  MAX_PLAN_EDGES,
  MAX_PLAN_NODES,
  MAX_PLAN_TITLE_LENGTH,
  MAX_QUESTIONS_PER_NODE,
  PLAN_NODE_STATUSES,
  PLAN_STAGES,
  PLAN_STATUSES,
} from "@/lib/plans/graph";

export const planIdSchema = z.uuid("Invalid plan ID");
export const planNodeIdSchema = z.uuid("Invalid plan node ID");

const rubricDimensionSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  weight: z.number().positive().max(1),
  description: z.string().trim().min(1).max(500),
});

const nonEmptyStringsSchema = z.array(z.string().trim().min(1).max(120)).max(20);

export const roundProfileSchema = z.object({
  round_key: z.string().trim().min(1).max(64),
  stage: z.enum(PLAN_STAGES),
  purpose: z.string().trim().min(1).max(500),
  competencies: nonEmptyStringsSchema.min(1),
  question_strategy: z.object({
    preferred_categories: nonEmptyStringsSchema,
    required_tags: nonEmptyStringsSchema,
    preferred_tags: nonEmptyStringsSchema,
    excluded_tags: nonEmptyStringsSchema,
    company_theme_ids: nonEmptyStringsSchema,
    avoid_plan_question_repeats: z.boolean(),
  }),
  rubric_key: z.string().trim().min(1).max(100),
  rubric_dimensions: z.array(rubricDimensionSchema).min(1).max(12),
  context_mode: z.literal("fresh"),
});

const interviewConfigSchema = z.object({
  interview_type: z.enum(INTERVIEW_TYPE_VALUES),
  duration_minutes: z.union(INTERVIEW_DURATION_VALUES.map((value) => z.literal(value))),
  difficulty: z.enum(INTERVIEW_DIFFICULTY_VALUES),
  round_profile: roundProfileSchema.optional(),
});

const questionSetConfigSchema = z.object({
  question_ids: z.array(z.number().int().positive()).min(1).max(MAX_QUESTIONS_PER_NODE)
    .refine((ids) => new Set(ids).size === ids.length, "Question IDs must be unique"),
});

const nodeBaseSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(MAX_PLAN_TITLE_LENGTH),
  position_x: z.number().finite(),
  position_y: z.number().finite(),
  status: z.enum(PLAN_NODE_STATUSES),
  result_interview_id: z.uuid().nullable().optional(),
  result_score: z.number().int().min(0).max(100).nullable().optional(),
  completed_at: z.iso.datetime().nullable().optional(),
});

export const planNodeSchema = z.discriminatedUnion("type", [
  nodeBaseSchema.extend({ type: z.literal("interview"), config: interviewConfigSchema }),
  nodeBaseSchema.extend({ type: z.literal("question_set"), config: questionSetConfigSchema }),
]);

export const planEdgeSchema = z.object({
  id: z.uuid(),
  source_node_id: z.uuid(),
  target_node_id: z.uuid(),
});

export const planGraphSchema = z.object({
  nodes: z.array(planNodeSchema).max(MAX_PLAN_NODES),
  edges: z.array(planEdgeSchema).max(MAX_PLAN_EDGES),
});

export const createPlanSchema = z.object({
  title: z.string().trim().min(1).max(MAX_PLAN_TITLE_LENGTH).default("Untitled interview plan"),
  template_key: z.string().trim().min(1).max(64).optional(),
  blueprint_key: z.string().trim().min(1).max(100).optional(),
  target: z.object({
    company: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(200),
    level: z.enum(INTERVIEW_LEVEL_VALUES),
    interview_date: z.iso.date().optional(),
    job_description: z.string().trim().max(10000).optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.template_key && value.target) {
    ctx.addIssue({ code: "custom", path: ["target"], message: "Choose either a legacy template or a target" });
  }
  if (value.blueprint_key && !value.target) {
    ctx.addIssue({ code: "custom", path: ["blueprint_key"], message: "A blueprint requires a target" });
  }
});

export const updatePlanSchema = z.object({
  title: z.string().trim().min(1).max(MAX_PLAN_TITLE_LENGTH).optional(),
  status: z.enum(PLAN_STATUSES).optional(),
}).refine((value) => value.title !== undefined || value.status !== undefined, "No changes supplied");

export const startPlanNodeSchema = z.object({
  interview_id: z.uuid().optional(),
}).default({});

export const completePlanNodeSchema = z.object({
  score: z.number().int().min(0).max(100).optional(),
}).default({});
