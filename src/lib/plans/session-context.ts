import type { RoundProfile } from "@/lib/plans/graph";
import { roundProfileSchema } from "@/lib/plans/contracts";

export type PlanSessionProvenance = {
  planId: string;
  nodeId: string;
  blueprintKey: string | null;
  blueprintVersion: number | null;
};

function readPlanContext(sessionPlan: unknown): Record<string, unknown> | null {
  if (!sessionPlan || typeof sessionPlan !== "object") return null;
  const context = (sessionPlan as Record<string, unknown>).planContext;
  return context && typeof context === "object" ? context as Record<string, unknown> : null;
}

export function readRoundProfileFromSessionPlan(sessionPlan: unknown): RoundProfile | null {
  const context = readPlanContext(sessionPlan);
  const parsed = roundProfileSchema.safeParse(context?.roundProfile);
  return parsed.success ? parsed.data : null;
}

export function readPlanSessionProvenance(sessionPlan: unknown): PlanSessionProvenance | null {
  const context = readPlanContext(sessionPlan);
  if (!context || typeof context.planId !== "string" || typeof context.nodeId !== "string") return null;
  const target = context.target && typeof context.target === "object"
    ? context.target as Record<string, unknown>
    : null;
  return {
    planId: context.planId,
    nodeId: context.nodeId,
    blueprintKey: typeof target?.blueprint_key === "string" ? target.blueprint_key : null,
    blueprintVersion: typeof target?.blueprint_version === "number" ? target.blueprint_version : null,
  };
}
