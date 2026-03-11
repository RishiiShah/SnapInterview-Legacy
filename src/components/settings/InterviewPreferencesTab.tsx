"use client";

import OnboardingPreferencesForm, {
} from "@/components/onboarding/OnboardingPreferencesForm";
import type { OnboardingPreferencesFormValues } from "@/lib/onboarding/preferences";

type InterviewPreferencesTabProps = {
  initialValues: Partial<OnboardingPreferencesFormValues>;
};

export default function InterviewPreferencesTab({ initialValues }: InterviewPreferencesTabProps) {
  return (
    <OnboardingPreferencesForm
      initialValues={initialValues}
      submitLabel="Save interview preferences"
      title="Interview Preferences"
      description="Keep your target role and practice defaults up to date."
    />
  );
}