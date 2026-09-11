import { describe, expect, it } from "vitest";

import { validatePlanGraph } from "@/lib/plans/graph";
import { getPlanTemplate, listPlanTemplates } from "@/lib/plans/templates";

describe("plan templates", () => {
  it("contains three valid multi-node graphs", () => {
    const templates = listPlanTemplates();
    expect(templates).toHaveLength(3);
    for (const template of templates) {
      expect(template.nodes.length).toBeGreaterThanOrEqual(2);
      expect(validatePlanGraph(template)).toBe(true);
    }
  });

  it("returns null for a missing template", () => {
    expect(getPlanTemplate("missing")).toBeNull();
  });

  it("creates fresh node IDs for every clone", () => {
    const first = getPlanTemplate("coding-focus");
    const second = getPlanTemplate("coding-focus");
    expect(first?.nodes[0].id).not.toBe(second?.nodes[0].id);
  });
});
