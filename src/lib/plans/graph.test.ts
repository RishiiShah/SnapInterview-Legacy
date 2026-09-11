import { describe, expect, it } from "vitest";

import {
  applyPlanUnlocks,
  type InterviewPlanEdge,
  type InterviewPlanNode,
  validatePlanGraph,
} from "@/lib/plans/graph";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function interviewNode(id: string, status: InterviewPlanNode["status"] = "locked"): InterviewPlanNode {
  return {
    id,
    type: "interview",
    title: "Coding interview",
    position_x: 0,
    position_y: 0,
    status,
    config: {
      interview_type: "coding-algorithms",
      duration_minutes: 30,
      difficulty: "medium",
    },
  };
}

describe("validatePlanGraph", () => {
  it("rejects an unknown node type", () => {
    const node = { ...interviewNode(A), type: "reading" } as unknown as InterviewPlanNode;
    expect(validatePlanGraph({ nodes: [node], edges: [] })).toBe(false);
  });

  it("rejects cycles", () => {
    const edges: InterviewPlanEdge[] = [
      { id: "33333333-3333-4333-8333-333333333333", source_node_id: A, target_node_id: B },
      { id: "44444444-4444-4444-8444-444444444444", source_node_id: B, target_node_id: A },
    ];
    expect(validatePlanGraph({ nodes: [interviewNode(A), interviewNode(B)], edges })).toBe(false);
  });

  it("accepts an empty blank plan", () => {
    expect(validatePlanGraph({ nodes: [], edges: [] })).toBe(true);
  });
});

describe("applyPlanUnlocks", () => {
  it("marks roots available and leaves successors locked", () => {
    const edges: InterviewPlanEdge[] = [
      { id: "33333333-3333-4333-8333-333333333333", source_node_id: A, target_node_id: B },
    ];
    const result = applyPlanUnlocks([interviewNode(A), interviewNode(B)], edges);
    expect(result.map((node) => node.status)).toEqual(["available", "locked"]);
  });

  it("unlocks a successor after every predecessor is done", () => {
    const edges: InterviewPlanEdge[] = [
      { id: "33333333-3333-4333-8333-333333333333", source_node_id: A, target_node_id: B },
    ];
    const result = applyPlanUnlocks([interviewNode(A, "completed"), interviewNode(B)], edges);
    expect(result[1].status).toBe("available");
  });
});
