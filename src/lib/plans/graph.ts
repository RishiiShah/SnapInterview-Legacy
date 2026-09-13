import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_DURATION_VALUES,
  INTERVIEW_TYPE_VALUES,
  type Difficulty,
  type InterviewDuration,
  type InterviewLevel,
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
export const PLAN_STAGES = ["preparation", "interview_loop"] as const;
export const BLUEPRINT_RESOLUTIONS = ["exact", "company_role_family", "role_family", "general"] as const;

export const MAX_PLAN_TITLE_LENGTH = 120;
export const MAX_PLAN_NODES = 30;
export const MAX_PLAN_EDGES = 40;
export const MAX_QUESTIONS_PER_NODE = 20;
export const MAX_PLANS_PER_USER = 20;

export type PlanNodeType = (typeof PLAN_NODE_TYPES)[number];
export type PlanNodeStatus = (typeof PLAN_NODE_STATUSES)[number];
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export type PlanSource = (typeof PLAN_SOURCES)[number];
export type PlanStage = (typeof PLAN_STAGES)[number];
export type BlueprintResolution = (typeof BLUEPRINT_RESOLUTIONS)[number];

export type RoundRubricDimension = {
  key: string;
  label: string;
  weight: number;
  description: string;
};

export type RoundProfile = {
  round_key: string;
  stage: PlanStage;
  purpose: string;
  competencies: string[];
  question_strategy: {
    preferred_categories: string[];
    required_tags: string[];
    preferred_tags: string[];
    excluded_tags: string[];
    company_theme_ids: string[];
    avoid_plan_question_repeats: boolean;
  };
  rubric_key: string;
  rubric_dimensions: RoundRubricDimension[];
  context_mode: "fresh";
};

export type InterviewPlanTarget = {
  company: string;
  company_key: string;
  role: string;
  role_slug: string;
  role_family: string;
  level: InterviewLevel;
  interview_date?: string | null;
  job_description?: string | null;
  blueprint_key: string;
  blueprint_version: number;
  blueprint_reviewed_at: string;
  resolution: BlueprintResolution;
};

export type InterviewNodeConfig = {
  interview_type: InterviewType;
  duration_minutes: InterviewDuration;
  difficulty: Difficulty;
  round_profile?: RoundProfile;
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
  target?: InterviewPlanTarget | null;
  customized_from_blueprint?: boolean;
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
    && (INTERVIEW_DIFFICULTY_VALUES as readonly unknown[]).includes(value.difficulty)
    && (value.round_profile === undefined || isRoundProfile(value.round_profile));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function isRoundProfile(profile: unknown): profile is RoundProfile {
  if (!profile || typeof profile !== "object") return false;
  const value = profile as Record<string, unknown>;
  const strategy = value.question_strategy as Record<string, unknown> | null;
  const dimensions = value.rubric_dimensions;
  return typeof value.round_key === "string" && value.round_key.length > 0
    && (PLAN_STAGES as readonly unknown[]).includes(value.stage)
    && typeof value.purpose === "string" && value.purpose.length > 0
    && isStringArray(value.competencies)
    && Boolean(strategy)
    && isStringArray(strategy?.preferred_categories)
    && isStringArray(strategy?.required_tags)
    && isStringArray(strategy?.preferred_tags)
    && isStringArray(strategy?.excluded_tags)
    && isStringArray(strategy?.company_theme_ids)
    && typeof strategy?.avoid_plan_question_repeats === "boolean"
    && typeof value.rubric_key === "string" && value.rubric_key.length > 0
    && Array.isArray(dimensions) && dimensions.length > 0
    && dimensions.every((dimension) => {
      if (!dimension || typeof dimension !== "object") return false;
      const item = dimension as Record<string, unknown>;
      return typeof item.key === "string" && item.key.length > 0
        && typeof item.label === "string" && item.label.length > 0
        && typeof item.description === "string" && item.description.length > 0
        && typeof item.weight === "number" && item.weight > 0 && item.weight <= 1;
    })
    && value.context_mode === "fresh";
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
