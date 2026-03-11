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

  it("preserves valid interview types and falls back for invalid ones", () => {
    expect(
      normalizeOnboardingFormValues({
        onboardingRole: "Frontend Engineer",
        preferredInterviewType: "technical",
      })
    ).toEqual({
      ...DEFAULT_ONBOARDING_FORM_VALUES,
      onboardingRole: "Frontend Engineer",
      preferredInterviewType: "technical",
    });

    expect(
      normalizeOnboardingFormValues({
        preferredInterviewType: "invalid-type",
      })
    ).toEqual(DEFAULT_ONBOARDING_FORM_VALUES);
  });

  it("normalizes response payloads with onboarding completion", () => {
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