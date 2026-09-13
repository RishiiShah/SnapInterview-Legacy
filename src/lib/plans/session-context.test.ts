import { describe, expect, it } from "vitest";

import {
  readPlanSessionProvenance,
  readRoundProfileFromSessionPlan,
} from "@/lib/plans/session-context";

const roundProfile = {
  round_key: "frontend-coding",
  stage: "interview_loop" as const,
  purpose: "Assess practical frontend implementation.",
  competencies: ["JavaScript", "Accessibility"],
  question_strategy: {
    preferred_categories: ["Front-end"],
    required_tags: [],
    preferred_tags: ["react"],
    excluded_tags: ["system-design"],
    company_theme_ids: [],
    avoid_plan_question_repeats: true,
  },
  rubric_key: "frontend-implementation-v1",
  rubric_dimensions: [
    {
      key: "implementation",
      label: "Implementation",
      weight: 1,
      description: "Builds a correct and accessible interface.",
    },
  ],
  context_mode: "fresh" as const,
};

describe("plan session context", () => {
  it("reads a valid node-scoped round profile and provenance", () => {
    const sessionPlan = {
      version: 2,
      planContext: {
        planId: "plan-1",
        nodeId: "node-1",
        target: {
          blueprint_key: "amazon-frontend",
          blueprint_version: 3,
        },
        roundProfile,
      },
    };

    expect(readRoundProfileFromSessionPlan(sessionPlan)).toEqual(roundProfile);
    expect(readPlanSessionProvenance(sessionPlan)).toEqual({
      planId: "plan-1",
      nodeId: "node-1",
      blueprintKey: "amazon-frontend",
      blueprintVersion: 3,
    });
  });

  it("rejects malformed round context instead of partially trusting it", () => {
    expect(readRoundProfileFromSessionPlan({
      planContext: {
        roundProfile: { ...roundProfile, context_mode: "shared" },
      },
    })).toBeNull();
    expect(readPlanSessionProvenance({ planContext: { planId: "plan-1" } })).toBeNull();
  });
});
