import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_DURATION_VALUES,
  INTERVIEW_TYPE_VALUES,
  type Difficulty,
  type InterviewDuration,
  type InterviewType,
} from "@/lib/interview/domain";

export const PLAN_NODE_TYPES = ["interview", "question_set"] as const;
export const PLAN_NODE_STATUSES = [
  "locked",
  "available",
  "in_progress",
  "completed",
  "skipped",
] as const;
export const PLAN_STATUSES = ["draft", "active", "archived"] as const;
export const PLAN_SOURCES = ["template", "custom"] as const;

export const MAX_PLAN_TITLE_LENGTH = 120;
export const MAX_PLAN_NODES = 30;
export const MAX_PLAN_EDGES = 40;
export const MAX_QUESTIONS_PER_NODE = 20;
export const MAX_PLANS_PER_USER = 20;

export type PlanNodeType = (typeof PLAN_NODE_TYPES)[number];
export type PlanNodeStatus = (typeof PLAN_NODE_STATUSES)[number];
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export type PlanSource = (typeof PLAN_SOURCES)[number];

export type InterviewNodeConfig = {
  interview_type: InterviewType;
  duration_minutes: InterviewDuration;
  difficulty: Difficulty;
};

export type QuestionSetNodeConfig = {
  question_ids: number[];
};

export type InterviewPlanNode = {
  id: string;
  type: PlanNodeType;
  title: string;
  position_x: number;
  position_y: number;
  status: PlanNodeStatus;
  config: InterviewNodeConfig | QuestionSetNodeConfig;
  result_interview_id?: string | null;
  result_score?: number | null;
  completed_at?: string | null;
};

export type InterviewPlanEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
};

export type InterviewPlanGraph = {
  nodes: InterviewPlanNode[];
  edges: InterviewPlanEdge[];
};

export type InterviewPlan = InterviewPlanGraph & {
  id: string;
  title: string;
  status: PlanStatus;
  source: PlanSource;
  template_key?: string | null;
  created_at: string;
  updated_at: string;
};

export type InterviewPlanSummary = Omit<InterviewPlan, "nodes" | "edges"> & {
  node_count: number;
  completed_node_count: number;
};

export type InterviewPlanTemplate = InterviewPlanGraph & {
  key: string;
  title: string;
  description: string;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isInterviewConfig(config: unknown): config is InterviewNodeConfig {
  if (!config || typeof config !== "object") return false;
  const value = config as Record<string, unknown>;
  return (INTERVIEW_TYPE_VALUES as readonly unknown[]).includes(value.interview_type)
    && (INTERVIEW_DURATION_VALUES as readonly unknown[]).includes(value.duration_minutes)
    && (INTERVIEW_DIFFICULTY_VALUES as readonly unknown[]).includes(value.difficulty);
}

function isQuestionSetConfig(config: unknown): config is QuestionSetNodeConfig {
  if (!config || typeof config !== "object") return false;
  const ids = (config as Record<string, unknown>).question_ids;
  return Array.isArray(ids)
    && ids.length >= 1
    && ids.length <= MAX_QUESTIONS_PER_NODE
    && ids.every((id) => Number.isSafeInteger(id) && Number(id) > 0)
    && new Set(ids).size === ids.length;
}

export function isDoneStatus(status: PlanNodeStatus): boolean {
  return status === "completed" || status === "skipped";
}

export function validatePlanGraph({ nodes, edges }: InterviewPlanGraph): boolean {
  if (nodes.length > MAX_PLAN_NODES || edges.length > MAX_PLAN_EDGES) return false;

  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!isUuid(node.id) || nodeIds.has(node.id)) return false;
    if (!node.title.trim() || [...node.title].length > MAX_PLAN_TITLE_LENGTH) return false;
    if (!Number.isFinite(node.position_x) || !Number.isFinite(node.position_y)) return false;
    if (!(PLAN_NODE_STATUSES as readonly string[]).includes(node.status)) return false;
    if (node.type === "interview" && !isInterviewConfig(node.config)) return false;
    if (node.type === "question_set" && !isQuestionSetConfig(node.config)) return false;
    if (!(PLAN_NODE_TYPES as readonly string[]).includes(node.type)) return false;
    if (node.result_score != null && (!Number.isInteger(node.result_score) || node.result_score < 0 || node.result_score > 100)) return false;
    nodeIds.add(node.id);
  }

  const adjacency = new Map<string, string[]>();
  const indegree = new Map([...nodeIds].map((id) => [id, 0]));
  const connections = new Set<string>();
  for (const edge of edges) {
    if (!isUuid(edge.id) || edge.source_node_id === edge.target_node_id) return false;
    if (!nodeIds.has(edge.source_node_id) || !nodeIds.has(edge.target_node_id)) return false;
    const key = `${edge.source_node_id}->${edge.target_node_id}`;
    if (connections.has(key)) return false;
    connections.add(key);
    adjacency.set(edge.source_node_id, [...(adjacency.get(edge.source_node_id) ?? []), edge.target_node_id]);
    indegree.set(edge.target_node_id, (indegree.get(edge.target_node_id) ?? 0) + 1);
  }

  const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    visited += 1;
    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }

  return visited === nodes.length;
}

export function applyPlanUnlocks(nodes: InterviewPlanNode[], edges: InterviewPlanEdge[]): InterviewPlanNode[] {
  const done = new Set(nodes.filter((node) => isDoneStatus(node.status)).map((node) => node.id));
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    incoming.set(edge.target_node_id, [...(incoming.get(edge.target_node_id) ?? []), edge.source_node_id]);
  }

  return nodes.map((node) => {
    if (isDoneStatus(node.status) || node.status === "in_progress") return { ...node };
    const ready = (incoming.get(node.id) ?? []).every((predecessor) => done.has(predecessor));
    return { ...node, status: ready ? "available" : "locked" };
  });
}
