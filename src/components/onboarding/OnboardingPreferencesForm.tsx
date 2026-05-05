"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SearchableDropdown from "@/components/SearchableDropdown";
import SelectDropdown from "@/components/SelectDropdown";
import { COMPANIES, EXPERIENCE_LEVELS, INTERVIEW_GOALS, CATEGORIES, ROLES } from "@/data/constants";
import type { InterviewType } from "@/data/types";
import {
  DEFAULT_ONBOARDING_FORM_VALUES,
  type OnboardingPreferencesFormValues,
} from "@/lib/onboarding/preferences";

type OnboardingPreferencesFormProps = {
  initialValues?: Partial<OnboardingPreferencesFormValues>;
  submitLabel: string;
  title: string;
  description: string;
  showInterviewTypeField?: boolean;
  redirectTo?: string;
  onSaved?: () => void;
};

export default function OnboardingPreferencesForm({
  initialValues,
  submitLabel,
  title,
  description,
  showInterviewTypeField = true,
  redirectTo,
  onSaved,
}: OnboardingPreferencesFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<OnboardingPreferencesFormValues>({
    ...DEFAULT_ONBOARDING_FORM_VALUES,
    ...initialValues,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.onboardingRole.trim()) {
      setError("Choose the role you want to practice for.");
      return;
    }

    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Failed to save preferences.");
        return;
      }

      setSaved(true);
      onSaved?.();

      if (redirectTo) {
        // Only allow same-origin paths (no protocol, no //, no leading backslash)
        const safePath =
          typeof redirectTo === "string" &&
          redirectTo.startsWith("/") &&
          !redirectTo.startsWith("//") &&
          !redirectTo.includes(":")
            ? redirectTo
            : "/dashboard";
        router.push(safePath);
        router.refresh();
        return;
      }

      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-8 py-6">
        <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 px-8 py-6">
        <div className="grid gap-5 md:grid-cols-2">
          <SearchableDropdown
            label="Target role"
            value={values.onboardingRole}
            onChange={(onboardingRole) => setValues((previous) => ({ ...previous, onboardingRole }))}
            options={ROLES}
            placeholder="Search or type your target role"
          />

          <SelectDropdown
            label="Experience level"
            value={values.onboardingLevel}
            onChange={(onboardingLevel) => setValues((previous) => ({ ...previous, onboardingLevel }))}
            options={EXPERIENCE_LEVELS}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <SearchableDropdown
            label="Target company"
            value={values.onboardingCompany}
            onChange={(onboardingCompany) => setValues((previous) => ({ ...previous, onboardingCompany }))}
            options={COMPANIES}
            placeholder="Optional company target"
            isOptional
          />

          <SelectDropdown
            label="Primary goal"
            value={values.onboardingGoal}
            onChange={(onboardingGoal) => setValues((previous) => ({ ...previous, onboardingGoal }))}
            options={INTERVIEW_GOALS}
          />
        </div>

        {showInterviewTypeField && (
          <SelectDropdown
            label="Default interview type"
            value={values.preferredInterviewType}
            onChange={(preferredInterviewType) =>
              setValues((previous) => ({
                ...previous,
                preferredInterviewType: preferredInterviewType as InterviewType,
              }))
            }
            options={CATEGORIES.map((category) => ({ value: category.value, label: category.label }))}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 border-t border-zinc-100 pt-5">
          <button
            type="submit"
            disabled={isSaving}
            className="cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : submitLabel}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </form>
    </div>
  );
}