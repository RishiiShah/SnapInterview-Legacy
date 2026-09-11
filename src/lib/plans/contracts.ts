import { z } from "zod/v4";

import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_DURATION_VALUES,
  INTERVIEW_TYPE_VALUES,
} from "@/lib/interview/domain";
import {
  MAX_PLAN_EDGES,
  MAX_PLAN_NODES,
  MAX_PLAN_TITLE_LENGTH,
  MAX_QUESTIONS_PER_NODE,
  PLAN_NODE_STATUSES,
  PLAN_STATUSES,
} from "@/lib/plans/graph";

export const planIdSchema = z.uuid("Invalid plan ID");
export const planNodeIdSchema = z.uuid("Invalid plan node ID");

const interviewConfigSchema = z.object({
  interview_type: z.enum(INTERVIEW_TYPE_VALUES),
  duration_minutes: z.union(INTERVIEW_DURATION_VALUES.map((value) => z.literal(value))),
  difficulty: z.enum(INTERVIEW_DIFFICULTY_VALUES),
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
