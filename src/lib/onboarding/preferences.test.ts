import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONBOARDING_FORM_VALUES,
  getDefaultDifficultyForOnboardingLevel,
  normalizeOnboardingFormValues,
  normalizeOnboardingResponse,
} from "./preferences";

describe("onboarding preferences helpers", () => {
  it("normalizes missing values to shared defaults", () => {
    expect(normalizeOnboardingFormValues(null)).toEqual(DEFAULT_ONBOARDING_FORM_VALUES);
  });

  it("trims roles and keeps canonical taxonomy values intact", () => {
    expect(
      normalizeOnboardingFormValues({
        onboardingRole: "  Software Engineer - Backend  ",
        preferredInterviewType: "technical",
      })
    ).toEqual({
      ...DEFAULT_ONBOARDING_FORM_VALUES,
      onboardingRole: "Software Engineer - Backend",
      preferredInterviewType: "coding-algorithms",
    });

    expect(
      normalizeOnboardingFormValues({
        preferredInterviewType: "invalid-type",
      })
    ).toEqual(DEFAULT_ONBOARDING_FORM_VALUES);
  });

  it("preserves response payloads without legacy alias remapping", () => {
    expect(
      normalizeOnboardingResponse({
        onboardingCompleted: true,
        onboardingRole: "Backend Engineer",
        onboardingLevel: "senior",
        onboardingCompany: "Stripe",
        onboardingGoal: "prepare-for-promo",
        preferredInterviewType: "system-design",
      })
    ).toEqual({
      onboardingCompleted: true,
      onboardingRole: "Backend Engineer",
      onboardingLevel: "senior",
      onboardingCompany: "Stripe",
      onboardingGoal: "prepare-for-promo",
      preferredInterviewType: "system-design",
    });
  });

  it("derives default difficulty from onboarding level", () => {
    expect(getDefaultDifficultyForOnboardingLevel("entry-level")).toBe("easy");
    expect(getDefaultDifficultyForOnboardingLevel("mid-level")).toBe("medium");
    expect(getDefaultDifficultyForOnboardingLevel("senior")).toBe("hard");
    expect(getDefaultDifficultyForOnboardingLevel("staff-plus")).toBe("hard");
    expect(getDefaultDifficultyForOnboardingLevel(undefined)).toBe("medium");
  });
});