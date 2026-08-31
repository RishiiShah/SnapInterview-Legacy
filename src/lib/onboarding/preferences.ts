import type { InterviewType } from "@/data/types";
import { interviewTypeSchema } from "@/lib/interview/domain";

export type OnboardingPreferencesFormValues = {
  onboardingRole: string;
  onboardingLevel: string;
  onboardingCompany: string;
  onboardingGoal: string;
  preferredInterviewType: InterviewType;
};

export type OnboardingPreferencesResponse = OnboardingPreferencesFormValues & {
  onboardingCompleted: boolean;
};

type OnboardingPreferenceSource = Partial<{
  onboardingCompleted: boolean | null;
  onboardingRole: string | null;
  onboardingLevel: string | null;
  onboardingCompany: string | null;
  onboardingGoal: string | null;
  preferredInterviewType: string | null;
}>;

export const DEFAULT_ONBOARDING_FORM_VALUES: OnboardingPreferencesFormValues = {
  onboardingRole: "",
  onboardingLevel: "mid-level",
  onboardingCompany: "",
  onboardingGoal: "switch-companies",
  preferredInterviewType: "behavioral-leadership",
};

function resolvePreferredType(value: string | null | undefined): InterviewType {
  const parsed = interviewTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_ONBOARDING_FORM_VALUES.preferredInterviewType;
}

export function normalizeOnboardingFormValues(
  value: OnboardingPreferenceSource | null | undefined
): OnboardingPreferencesFormValues {
  const rawRole = value?.onboardingRole?.trim();
  return {
    onboardingRole: rawRole || DEFAULT_ONBOARDING_FORM_VALUES.onboardingRole,
    onboardingLevel: value?.onboardingLevel ?? DEFAULT_ONBOARDING_FORM_VALUES.onboardingLevel,
    onboardingCompany: value?.onboardingCompany ?? DEFAULT_ONBOARDING_FORM_VALUES.onboardingCompany,
    onboardingGoal: value?.onboardingGoal ?? DEFAULT_ONBOARDING_FORM_VALUES.onboardingGoal,
    preferredInterviewType: resolvePreferredType(value?.preferredInterviewType),
  };
}

export function normalizeOnboardingResponse(
  value: OnboardingPreferenceSource | null | undefined
): OnboardingPreferencesResponse {
  return {
    onboardingCompleted: Boolean(value?.onboardingCompleted),
    ...normalizeOnboardingFormValues(value),
  };
}
