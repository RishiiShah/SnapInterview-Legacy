import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewNodeConfig, InterviewPlan, InterviewPlanNode } from "@/lib/plans/graph";
import {
  countInterviewPlans,
  createInterviewPlanRecord,
  getInterviewPlan,
  replaceInterviewPlanGraph,
  setPlanNodeState,
  updatePlanNodeStatuses,
} from "@/repositories/plan-repo";
import {
  completeUserInterviewPlanNode,
  createUserInterviewPlan,
  saveUserInterviewPlanGraph,
  startUserInterviewPlanNode,
} from "@/services/plan-service";

vi.mock("@/repositories/plan-repo", () => ({
  countInterviewPlans: vi.fn(),
  createInterviewPlanRecord: vi.fn(),
  deleteInterviewPlanRecord: vi.fn(),
  getInterviewPlan: vi.fn(),
  interviewBelongsToUser: vi.fn(),
  listInterviewPlans: vi.fn(),
  replaceInterviewPlanGraph: vi.fn(),
  setPlanNodeState: vi.fn(),
  updateInterviewPlanRecord: vi.fn(),
  updatePlanNodeStatuses: vi.fn(),
}));

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const NODE_A = "22222222-2222-4222-8222-222222222222";
const NODE_B = "33333333-3333-4333-8333-333333333333";
const EDGE_ID = "44444444-4444-4444-8444-444444444444";
const INTERVIEW_ID = "55555555-5555-4555-8555-555555555555";

function node(id: string, status: InterviewPlanNode["status"]): InterviewPlanNode {
  return {
    id,
    type: "interview",
    title: "Coding",
    position_x: 0,
    position_y: 0,
    status,
    config: { interview_type: "coding-algorithms", duration_minutes: 30, difficulty: "medium" },
  };
}

function plan(nodes: InterviewPlanNode[], edges: InterviewPlan["edges"] = []): InterviewPlan {
  return {
    id: PLAN_ID,
    title: "Plan",
    status: "draft",
    source: "custom",
    created_at: "2026-09-10T00:00:00.000Z",
    updated_at: "2026-09-10T00:00:00.000Z",
    nodes,
    edges,
  };
}

describe("plan service graph integrity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves server-owned completion fields when the graph is saved", async () => {
    const persisted = {
      ...node(NODE_A, "completed"),
      result_interview_id: INTERVIEW_ID,
      result_score: 91,
      completed_at: "2026-09-10T01:00:00.000Z",
    };
    vi.mocked(getInterviewPlan).mockResolvedValue(plan([persisted]));
    vi.mocked(replaceInterviewPlanGraph).mockImplementation(async ({ graph }) => plan(graph.nodes, graph.edges));

    await saveUserInterviewPlanGraph({
      ownerUserId: "user-1",
      planId: PLAN_ID,
      graph: {
        nodes: [{ ...node(NODE_A, "available"), result_score: 1, result_interview_id: null }],
        edges: [],
      },
    });

    expect(replaceInterviewPlanGraph).toHaveBeenCalledWith(expect.objectContaining({
      markCustomizedFromBlueprint: false,
      graph: expect.objectContaining({
        nodes: [expect.objectContaining({
          status: "completed",
          result_interview_id: INTERVIEW_ID,
          result_score: 91,
        })],
      }),
    }));
  });

  it("marks a targeted blueprint as customized when its graph is edited", async () => {
    vi.mocked(getInterviewPlan).mockResolvedValue({
      ...plan([node(NODE_A, "available")]),
      source: "template",
      target: {
        company: "Google",
        company_key: "google",
        role: "Software Engineer",
        role_slug: "software-engineer",
        role_family: "swe",
        level: "mid-level",
        interview_date: null,
        job_description: null,
        blueprint_key: "google-swe",
        blueprint_version: 1,
        blueprint_reviewed_at: "2026-09-12",
        resolution: "exact",
      },
      customized_from_blueprint: false,
    });
    vi.mocked(replaceInterviewPlanGraph).mockImplementation(async ({ graph }) => plan(graph.nodes, graph.edges));

    await saveUserInterviewPlanGraph({
      ownerUserId: "user-1",
      planId: PLAN_ID,
      graph: { nodes: [node(NODE_A, "available")], edges: [] },
    });

    expect(replaceInterviewPlanGraph).toHaveBeenCalledWith(expect.objectContaining({
      markCustomizedFromBlueprint: true,
    }));
  });

  it("does not start a locked node", async () => {
    vi.mocked(getInterviewPlan).mockResolvedValue(plan([node(NODE_A, "locked")]));
    await expect(startUserInterviewPlanNode({ ownerUserId: "user-1", planId: PLAN_ID, nodeId: NODE_A }))
      .rejects.toMatchObject({ code: "NODE_NOT_READY", status: 409 });
    expect(setPlanNodeState).not.toHaveBeenCalled();
  });

  it("unlocks successors when a node completes", async () => {
    const edge = { id: EDGE_ID, source_node_id: NODE_A, target_node_id: NODE_B };
    vi.mocked(getInterviewPlan)
      .mockResolvedValueOnce(plan([node(NODE_A, "in_progress"), node(NODE_B, "locked")], [edge]))
      .mockResolvedValueOnce(plan([node(NODE_A, "completed"), node(NODE_B, "locked")], [edge]))
      .mockResolvedValueOnce(plan([node(NODE_A, "completed"), node(NODE_B, "available")], [edge]));
    vi.mocked(setPlanNodeState).mockResolvedValue(true);
    vi.mocked(updatePlanNodeStatuses).mockResolvedValue();

    const result = await completeUserInterviewPlanNode({ ownerUserId: "user-1", planId: PLAN_ID, nodeId: NODE_A, score: 88 });

    expect(setPlanNodeState).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", resultScore: 88 }));
    expect(updatePlanNodeStatuses).toHaveBeenCalledWith("user-1", PLAN_ID, [
      expect.objectContaining({ id: NODE_A, status: "completed" }),
      expect.objectContaining({ id: NODE_B, status: "available" }),
    ]);
    expect(result.nodes[1].status).toBe("available");
  });
});

describe("targeted plan creation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates Google SWE rounds from the resolved blueprint", async () => {
    vi.mocked(countInterviewPlans).mockResolvedValue(0);
    vi.mocked(createInterviewPlanRecord).mockImplementation(async ({ title, source, templateKey, target, graph }) => ({
      id: PLAN_ID,
      title,
      status: "draft",
      source,
      template_key: templateKey,
      target,
      customized_from_blueprint: false,
      created_at: "2026-09-12T00:00:00.000Z",
      updated_at: "2026-09-12T00:00:00.000Z",
      ...graph,
    }));

    const result = await createUserInterviewPlan({
      ownerUserId: "user-1",
      title: "Google SWE",
      target: { company: "Google", role: "Software Engineer", level: "mid-level" },
    });

    expect(result.target).toMatchObject({ company_key: "google", role_slug: "software-engineer", blueprint_key: "google-swe", resolution: "exact" });
    expect(result.nodes.map((item) => (item.config as InterviewNodeConfig).round_profile?.round_key)).toEqual([
      "coding-1",
      "coding-2",
      "system-design",
      "googleyness-leadership",
    ]);
    expect(result.edges).toEqual([]);
    expect(createInterviewPlanRecord).toHaveBeenCalledWith(expect.objectContaining({ source: "template", templateKey: "google-swe" }));
  });

  it("rejects a forged incompatible blueprint selection", async () => {
    vi.mocked(countInterviewPlans).mockResolvedValue(0);
    await expect(createUserInterviewPlan({
      ownerUserId: "user-1",
      title: "Wrong loop",
      blueprintKey: "amazon-frontend",
      target: { company: "Google", role: "Software Engineer", level: "mid-level" },
    })).rejects.toMatchObject({ code: "INVALID_PLAN", status: 400 });
    expect(createInterviewPlanRecord).not.toHaveBeenCalled();
  });
});
