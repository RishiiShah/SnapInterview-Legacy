import { describe, expect, it } from "vitest";

import {
  listInterviewLoopBlueprints,
  materializeInterviewLoop,
  resolveInterviewLoopBlueprint,
} from "@/data/interview-loops";
import { validatePlanGraph } from "@/lib/plans/graph";
import type { InterviewNodeConfig } from "@/lib/plans/graph";

const roundKey = (node: { config: unknown }) => (node.config as InterviewNodeConfig).round_profile?.round_key;

describe("interview-loop blueprints", () => {
  it("validates every registered blueprint", () => {
    expect(listInterviewLoopBlueprints().map((blueprint) => blueprint.key)).toEqual([
      "google-swe",
      "amazon-frontend",
      "swe-family",
      "general-engineering",
    ]);
  });

  it("resolves Google SWE exactly and materializes independent rounds", () => {
    const resolution = resolveInterviewLoopBlueprint({
      company: "Google",
      role: "Software Engineer",
      level: "mid-level",
    });
    const graph = materializeInterviewLoop({ blueprint: resolution.blueprint, level: "mid-level" });

    expect(resolution.resolution).toBe("exact");
    expect(resolution.blueprint.key).toBe("google-swe");
    expect(graph.nodes.map(roundKey)).toEqual([
      "coding-1",
      "coding-2",
      "system-design",
      "googleyness-leadership",
    ]);
    expect(graph.edges).toEqual([]);
    expect(validatePlanGraph(graph)).toBe(true);
  });

  it("omits Google system design for the entry-level variant", () => {
    const resolution = resolveInterviewLoopBlueprint({ company: "Google", role: "Software Engineer", level: "entry-level" });
    const graph = materializeInterviewLoop({ blueprint: resolution.blueprint, level: "entry-level" });
    expect(graph.nodes.some((node) => roundKey(node) === "system-design")).toBe(false);
  });

  it("resolves the Amazon frontend role exactly", () => {
    const resolution = resolveInterviewLoopBlueprint({
      company: "Amazon",
      role: "Software Engineer - Frontend",
      level: "senior",
    });
    expect(resolution.resolution).toBe("exact");
    expect(resolution.blueprint.key).toBe("amazon-frontend");
  });

  it("uses the SWE family for an unreviewed company SWE combination", () => {
    const resolution = resolveInterviewLoopBlueprint({ company: "Stripe", role: "Software Engineer", level: "mid-level" });
    expect(resolution.resolution).toBe("role_family");
    expect(resolution.blueprint.key).toBe("swe-family");
  });

  it("uses the general fallback for an unsupported role family", () => {
    const resolution = resolveInterviewLoopBlueprint({ company: "Google", role: "Product Manager", level: "mid-level" });
    expect(resolution.resolution).toBe("general");
    expect(resolution.blueprint.key).toBe("general-engineering");
  });

  it("rejects a requested blueprint that does not match the target", () => {
    expect(() => resolveInterviewLoopBlueprint({
      company: "Google",
      role: "Software Engineer",
      level: "mid-level",
      requestedKey: "amazon-frontend",
    })).toThrow(/not compatible/i);
  });
});
