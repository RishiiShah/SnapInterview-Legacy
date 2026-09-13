import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  InterviewPlan,
  InterviewPlanEdge,
  InterviewPlanGraph,
  InterviewPlanNode,
  InterviewPlanSummary,
  InterviewPlanTarget,
  PlanSource,
  PlanStatus,
} from "@/lib/plans/graph";

type PlanRecord = Prisma.InterviewPlanGetPayload<{
  include: { nodes: true; edges: true };
}>;

function serializeNode(node: PlanRecord["nodes"][number]): InterviewPlanNode {
  return {
    id: node.id,
    type: node.nodeType as InterviewPlanNode["type"],
    title: node.title,
    position_x: node.positionX,
    position_y: node.positionY,
    status: node.status as InterviewPlanNode["status"],
    config: node.config as InterviewPlanNode["config"],
    result_interview_id: node.resultInterviewId,
    result_score: node.resultScore,
    completed_at: node.completedAt?.toISOString() ?? null,
  };
}

function serializeEdge(edge: PlanRecord["edges"][number]): InterviewPlanEdge {
  return {
    id: edge.id,
    source_node_id: edge.sourceNodeId,
    target_node_id: edge.targetNodeId,
  };
}

export function serializePlan(plan: PlanRecord): InterviewPlan {
  const target: InterviewPlanTarget | null = plan.targetCompany
    && plan.targetCompanyKey
    && plan.targetRole
    && plan.targetRoleSlug
    && plan.targetRoleFamily
    && plan.targetLevel
    && plan.blueprintKey
    && plan.blueprintVersion
    && plan.blueprintReviewedAt
    && plan.blueprintResolution
    ? {
        company: plan.targetCompany,
        company_key: plan.targetCompanyKey,
        role: plan.targetRole,
        role_slug: plan.targetRoleSlug,
        role_family: plan.targetRoleFamily,
        level: plan.targetLevel as InterviewPlanTarget["level"],
        interview_date: plan.interviewDate?.toISOString().slice(0, 10) ?? null,
        job_description: plan.jobDescription,
        blueprint_key: plan.blueprintKey,
        blueprint_version: plan.blueprintVersion,
        blueprint_reviewed_at: plan.blueprintReviewedAt.toISOString().slice(0, 10),
        resolution: plan.blueprintResolution as InterviewPlanTarget["resolution"],
      }
    : null;
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status as PlanStatus,
    source: plan.source as PlanSource,
    template_key: plan.templateKey,
    target,
    customized_from_blueprint: plan.customizedFromBlueprint,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
    nodes: plan.nodes.map(serializeNode),
    edges: plan.edges.map(serializeEdge),
  };
}

const planInclude = {
  nodes: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
  edges: { orderBy: { id: "asc" as const } },
};

export async function countInterviewPlans(ownerUserId: string): Promise<number> {
  return prisma.interviewPlan.count({ where: { ownerUserId } });
}

export async function listInterviewPlans(ownerUserId: string): Promise<InterviewPlanSummary[]> {
  const plans = await prisma.interviewPlan.findMany({
    where: { ownerUserId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    include: { nodes: { select: { status: true } } },
  });
  return plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    status: plan.status as PlanStatus,
    source: plan.source as PlanSource,
    template_key: plan.templateKey,
    target: plan.targetCompany
      && plan.targetCompanyKey
      && plan.targetRole
      && plan.targetRoleSlug
      && plan.targetRoleFamily
      && plan.targetLevel
      && plan.blueprintKey
      && plan.blueprintVersion
      && plan.blueprintReviewedAt
      && plan.blueprintResolution
      ? {
          company: plan.targetCompany,
          company_key: plan.targetCompanyKey,
          role: plan.targetRole,
          role_slug: plan.targetRoleSlug,
          role_family: plan.targetRoleFamily,
          level: plan.targetLevel as InterviewPlanTarget["level"],
          interview_date: plan.interviewDate?.toISOString().slice(0, 10) ?? null,
          job_description: plan.jobDescription,
          blueprint_key: plan.blueprintKey,
          blueprint_version: plan.blueprintVersion,
          blueprint_reviewed_at: plan.blueprintReviewedAt.toISOString().slice(0, 10),
          resolution: plan.blueprintResolution as InterviewPlanTarget["resolution"],
        }
      : null,
    customized_from_blueprint: plan.customizedFromBlueprint,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
    node_count: plan.nodes.length,
    completed_node_count: plan.nodes.filter((node) => node.status === "completed" || node.status === "skipped").length,
  }));
}

export async function getInterviewPlan(ownerUserId: string, id: string): Promise<InterviewPlan | null> {
  const plan = await prisma.interviewPlan.findFirst({
    where: { id, ownerUserId },
    include: planInclude,
  });
  return plan ? serializePlan(plan) : null;
}

function nodeCreateData(planId: string, node: InterviewPlanNode) {
  return {
    id: node.id,
    planId,
    nodeType: node.type,
    title: node.title,
    positionX: node.position_x,
    positionY: node.position_y,
    status: node.status,
    config: node.config as Prisma.InputJsonValue,
    resultInterviewId: node.result_interview_id ?? null,
    resultScore: node.result_score ?? null,
    completedAt: node.completed_at ? new Date(node.completed_at) : null,
  };
}

function edgeCreateData(planId: string, edge: InterviewPlanEdge) {
  return {
    id: edge.id,
    planId,
    sourceNodeId: edge.source_node_id,
    targetNodeId: edge.target_node_id,
  };
}

export async function createInterviewPlanRecord(input: {
  ownerUserId: string;
  title: string;
  source: PlanSource;
  templateKey?: string | null;
  target?: InterviewPlanTarget | null;
  graph: InterviewPlanGraph;
}): Promise<InterviewPlan> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.interviewPlan.create({
      data: {
        ownerUserId: input.ownerUserId,
        title: input.title,
        source: input.source,
        templateKey: input.templateKey ?? null,
        targetCompany: input.target?.company ?? null,
        targetCompanyKey: input.target?.company_key ?? null,
        targetRole: input.target?.role ?? null,
        targetRoleSlug: input.target?.role_slug ?? null,
        targetRoleFamily: input.target?.role_family ?? null,
        targetLevel: input.target?.level ?? null,
        interviewDate: input.target?.interview_date ? new Date(`${input.target.interview_date}T00:00:00.000Z`) : null,
        jobDescription: input.target?.job_description ?? null,
        blueprintKey: input.target?.blueprint_key ?? null,
        blueprintVersion: input.target?.blueprint_version ?? null,
        blueprintReviewedAt: input.target?.blueprint_reviewed_at ? new Date(`${input.target.blueprint_reviewed_at}T00:00:00.000Z`) : null,
        blueprintResolution: input.target?.resolution ?? null,
      },
    });
    if (input.graph.nodes.length > 0) {
      await tx.interviewPlanNode.createMany({
        data: input.graph.nodes.map((node) => nodeCreateData(created.id, node)),
      });
    }
    if (input.graph.edges.length > 0) {
      await tx.interviewPlanEdge.createMany({
        data: input.graph.edges.map((edge) => edgeCreateData(created.id, edge)),
      });
    }
    const plan = await tx.interviewPlan.findUniqueOrThrow({ where: { id: created.id }, include: planInclude });
    return serializePlan(plan);
  });
}

export async function updateInterviewPlanRecord(input: {
  ownerUserId: string;
  id: string;
  title?: string;
  status?: PlanStatus;
}): Promise<InterviewPlan | null> {
  const existing = await prisma.interviewPlan.findFirst({ where: { id: input.id, ownerUserId: input.ownerUserId }, select: { id: true } });
  if (!existing) return null;
  const plan = await prisma.interviewPlan.update({
    where: { id: existing.id },
    data: { title: input.title, status: input.status },
    include: planInclude,
  });
  return serializePlan(plan);
}

export async function deleteInterviewPlanRecord(ownerUserId: string, id: string): Promise<boolean> {
  const result = await prisma.interviewPlan.deleteMany({ where: { id, ownerUserId } });
  return result.count > 0;
}

export async function replaceInterviewPlanGraph(input: {
  ownerUserId: string;
  id: string;
  graph: InterviewPlanGraph;
  markCustomizedFromBlueprint?: boolean;
}): Promise<InterviewPlan | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.interviewPlan.findFirst({ where: { id: input.id, ownerUserId: input.ownerUserId }, select: { id: true } });
    if (!existing) return null;
    await tx.interviewPlanEdge.deleteMany({ where: { planId: input.id } });
    await tx.interviewPlanNode.deleteMany({ where: { planId: input.id } });
    if (input.graph.nodes.length > 0) {
      await tx.interviewPlanNode.createMany({ data: input.graph.nodes.map((node) => nodeCreateData(input.id, node)) });
    }
    if (input.graph.edges.length > 0) {
      await tx.interviewPlanEdge.createMany({ data: input.graph.edges.map((edge) => edgeCreateData(input.id, edge)) });
    }
    await tx.interviewPlan.update({
      where: { id: input.id },
      data: {
        updatedAt: new Date(),
        ...(input.markCustomizedFromBlueprint ? { customizedFromBlueprint: true } : {}),
      },
    });
    const plan = await tx.interviewPlan.findUniqueOrThrow({ where: { id: input.id }, include: planInclude });
    return serializePlan(plan);
  });
}

export async function setPlanNodeState(input: {
  ownerUserId: string;
  planId: string;
  nodeId: string;
  status: InterviewPlanNode["status"];
  resultInterviewId?: string | null;
  resultScore?: number | null;
  completedAt?: Date | null;
}): Promise<boolean> {
  const result = await prisma.interviewPlanNode.updateMany({
    where: { id: input.nodeId, planId: input.planId, plan: { ownerUserId: input.ownerUserId } },
    data: {
      status: input.status,
      resultInterviewId: input.resultInterviewId,
      resultScore: input.resultScore,
      completedAt: input.completedAt,
    },
  });
  if (result.count > 0) {
    await prisma.interviewPlan.update({ where: { id: input.planId }, data: { updatedAt: new Date() } });
  }
  return result.count > 0;
}

export async function updatePlanNodeStatuses(ownerUserId: string, planId: string, nodes: InterviewPlanNode[]): Promise<void> {
  await prisma.$transaction(nodes.map((node) => prisma.interviewPlanNode.updateMany({
    where: { id: node.id, planId, plan: { ownerUserId } },
    data: { status: node.status },
  })));
}

export async function interviewBelongsToUser(ownerUserId: string, interviewId: string): Promise<boolean> {
  return Boolean(await prisma.interviewSession.findFirst({
    where: { id: interviewId, userId: ownerUserId, deletedAt: null },
    select: { id: true },
  }));
}
