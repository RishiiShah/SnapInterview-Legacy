import {
  applyPlanUnlocks,
  MAX_PLANS_PER_USER,
  type InterviewNodeConfig,
  type InterviewPlan,
  type InterviewPlanGraph,
  type InterviewPlanNode,
  type InterviewPlanSummary,
  type InterviewPlanTemplate,
  type PlanStatus,
  type QuestionSetNodeConfig,
  validatePlanGraph,
} from "@/lib/plans/graph";
import { getPlanTemplate, listPlanTemplates } from "@/lib/plans/templates";
import {
  buildInterviewPlanTarget,
  materializeInterviewLoop,
  resolveInterviewLoopBlueprint,
} from "@/data/interview-loops";
import type { InterviewLevel } from "@/lib/interview/domain";
import {
  countInterviewPlans,
  createInterviewPlanRecord,
  deleteInterviewPlanRecord,
  getInterviewPlan,
  interviewBelongsToUser,
  listInterviewPlans,
  replaceInterviewPlanGraph,
  setPlanNodeState,
  updateInterviewPlanRecord,
  updatePlanNodeStatuses,
} from "@/repositories/plan-repo";

export class PlanServiceError extends Error {
  constructor(
    public readonly code: "INVALID_PLAN_GRAPH" | "NOT_FOUND" | "PLAN_LIMIT" | "NODE_NOT_READY" | "INVALID_PLAN",
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function invalidGraph(): never {
  throw new PlanServiceError("INVALID_PLAN_GRAPH", 400, "The interview plan graph is invalid.");
}

async function requirePlan(ownerUserId: string, planId: string): Promise<InterviewPlan> {
  const plan = await getInterviewPlan(ownerUserId, planId);
  if (!plan) throw new PlanServiceError("NOT_FOUND", 404, "Interview plan not found.");
  return plan;
}

export function getInterviewPlanTemplates(): InterviewPlanTemplate[] {
  return listPlanTemplates().map((template) => ({
    ...template,
    nodes: applyPlanUnlocks(template.nodes, template.edges),
  }));
}

export async function listUserInterviewPlans(ownerUserId: string): Promise<InterviewPlanSummary[]> {
  return listInterviewPlans(ownerUserId);
}

export async function getUserInterviewPlan(ownerUserId: string, planId: string): Promise<InterviewPlan> {
  return requirePlan(ownerUserId, planId);
}

export async function createUserInterviewPlan(input: {
  ownerUserId: string;
  title: string;
  templateKey?: string;
  blueprintKey?: string;
  target?: {
    company: string;
    role: string;
    level: InterviewLevel;
    interviewDate?: string;
    jobDescription?: string;
  };
}): Promise<InterviewPlan> {
  if (await countInterviewPlans(input.ownerUserId) >= MAX_PLANS_PER_USER) {
    throw new PlanServiceError("PLAN_LIMIT", 409, "You already have the maximum number of interview plans.");
  }
  const template = input.templateKey ? getPlanTemplate(input.templateKey) : null;
  if (input.templateKey && !template) {
    throw new PlanServiceError("NOT_FOUND", 404, "Interview plan template not found.");
  }
  let target = null;
  let blueprintTemplateKey: string | undefined;
  let graph: InterviewPlanGraph;
  if (input.target) {
    let resolution;
    try {
      resolution = resolveInterviewLoopBlueprint({
        company: input.target.company,
        role: input.target.role,
        level: input.target.level,
        requestedKey: input.blueprintKey,
      });
    } catch {
      throw new PlanServiceError("INVALID_PLAN", 400, "The selected interview-loop blueprint does not match this target.");
    }
    graph = materializeInterviewLoop({ blueprint: resolution.blueprint, level: input.target.level });
    target = buildInterviewPlanTarget({
      company: input.target.company,
      role: input.target.role,
      level: input.target.level,
      interviewDate: input.target.interviewDate,
      jobDescription: input.target.jobDescription,
      resolution,
    });
    blueprintTemplateKey = resolution.blueprint.key;
  } else {
    graph = template
      ? { nodes: applyPlanUnlocks(template.nodes, template.edges), edges: template.edges }
      : { nodes: [], edges: [] };
  }
  return createInterviewPlanRecord({
    ownerUserId: input.ownerUserId,
    title: input.title,
    source: template || target ? "template" : "custom",
    templateKey: template?.key ?? blueprintTemplateKey,
    target,
    graph,
  });
}

export async function updateUserInterviewPlan(input: {
  ownerUserId: string;
  planId: string;
  title?: string;
  status?: PlanStatus;
}): Promise<InterviewPlan> {
  const plan = await updateInterviewPlanRecord({
    ownerUserId: input.ownerUserId,
    id: input.planId,
    title: input.title,
    status: input.status,
  });
  if (!plan) throw new PlanServiceError("NOT_FOUND", 404, "Interview plan not found.");
  return plan;
}

export async function deleteUserInterviewPlan(ownerUserId: string, planId: string): Promise<void> {
  if (!await deleteInterviewPlanRecord(ownerUserId, planId)) {
    throw new PlanServiceError("NOT_FOUND", 404, "Interview plan not found.");
  }
}

export async function saveUserInterviewPlanGraph(input: {
  ownerUserId: string;
  planId: string;
  graph: InterviewPlanGraph;
}): Promise<InterviewPlan> {
  if (!validatePlanGraph(input.graph)) invalidGraph();
  const existing = await requirePlan(input.ownerUserId, input.planId);
  const existingNodes = new Map(existing.nodes.map((node) => [node.id, node]));
  const sanitizedNodes = input.graph.nodes.map((node) => {
    const persisted = existingNodes.get(node.id);
    return {
      ...node,
      status: persisted?.status ?? "locked",
      result_interview_id: persisted?.result_interview_id ?? null,
      result_score: persisted?.result_score ?? null,
      completed_at: persisted?.completed_at ?? null,
    };
  });
  const graph = { ...input.graph, nodes: applyPlanUnlocks(sanitizedNodes, input.graph.edges) };
  const plan = await replaceInterviewPlanGraph({
    ownerUserId: input.ownerUserId,
    id: input.planId,
    graph,
    markCustomizedFromBlueprint: Boolean(existing.target),
  });
  if (!plan) throw new PlanServiceError("NOT_FOUND", 404, "Interview plan not found.");
  return plan;
}

function findNode(plan: InterviewPlan, nodeId: string): InterviewPlanNode {
  const node = plan.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new PlanServiceError("NOT_FOUND", 404, "Interview plan node not found.");
  return node;
}

export async function startUserInterviewPlanNode(input: {
  ownerUserId: string;
  planId: string;
  nodeId: string;
  interviewId?: string;
}): Promise<{
  plan: InterviewPlan;
  launch: ({ kind: "interview" } & InterviewNodeConfig) | ({ kind: "question_set" } & QuestionSetNodeConfig);
}> {
  const plan = await requirePlan(input.ownerUserId, input.planId);
  const node = findNode(plan, input.nodeId);
  if (node.status !== "available" && node.status !== "in_progress") {
    throw new PlanServiceError("NODE_NOT_READY", 409, "This step is not available yet.");
  }
  if (input.interviewId && node.type !== "interview") {
    throw new PlanServiceError("INVALID_PLAN", 400, "An interview can only be attached to an interview node.");
  }
  if (input.interviewId && !await interviewBelongsToUser(input.ownerUserId, input.interviewId)) {
    throw new PlanServiceError("NOT_FOUND", 404, "Interview session not found.");
  }
  await setPlanNodeState({
    ownerUserId: input.ownerUserId,
    planId: input.planId,
    nodeId: input.nodeId,
    status: "in_progress",
    resultInterviewId: input.interviewId,
  });
  const updated = await requirePlan(input.ownerUserId, input.planId);
  return {
    plan: updated,
    launch: node.type === "interview"
      ? { kind: "interview", ...(node.config as InterviewNodeConfig) }
      : { kind: "question_set", ...(node.config as QuestionSetNodeConfig) },
  };
}

async function finishNode(input: {
  ownerUserId: string;
  planId: string;
  nodeId: string;
  status: "completed" | "skipped";
  score?: number;
}): Promise<InterviewPlan> {
  const plan = await requirePlan(input.ownerUserId, input.planId);
  const node = findNode(plan, input.nodeId);
  if (node.status === "locked") {
    throw new PlanServiceError("NODE_NOT_READY", 409, "This step is not available yet.");
  }
  await setPlanNodeState({
    ownerUserId: input.ownerUserId,
    planId: input.planId,
    nodeId: input.nodeId,
    status: input.status,
    resultScore: input.score,
    completedAt: new Date(),
  });
  const afterFinish = await requirePlan(input.ownerUserId, input.planId);
  const unlocked = applyPlanUnlocks(afterFinish.nodes, afterFinish.edges);
  await updatePlanNodeStatuses(input.ownerUserId, input.planId, unlocked);
  return requirePlan(input.ownerUserId, input.planId);
}

export function completeUserInterviewPlanNode(input: Omit<Parameters<typeof finishNode>[0], "status">): Promise<InterviewPlan> {
  return finishNode({ ...input, status: "completed" });
}

export function skipUserInterviewPlanNode(input: Omit<Parameters<typeof finishNode>[0], "status" | "score">): Promise<InterviewPlan> {
  return finishNode({ ...input, status: "skipped" });
}
