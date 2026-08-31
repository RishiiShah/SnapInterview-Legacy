"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SearchableDropdown from "@/components/SearchableDropdown";
import SelectDropdown from "@/components/SelectDropdown";
import { SendActionButton } from "@/components/ui/SendActionButton";
import {
  COMPANIES,
  EXPERIENCE_LEVELS,
  INTERVIEW_GOALS,
  INTERVIEW_KINDS,
  ROLES,
} from "@/data/constants";
import type { InterviewType } from "@/data/types";
import {
  DEFAULT_ONBOARDING_FORM_VALUES,
  normalizeOnboardingFormValues,
  type OnboardingPreferencesFormValues,
} from "@/lib/onboarding/preferences";

type OnboardingPreferencesFormProps = {
  initialValues?: Partial<OnboardingPreferencesFormValues>;
  submitLabel: string;
  redirectTo?: string;
  draftStorageKey?: string;
};

function readDraft(key: string): Partial<OnboardingPreferencesFormValues> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeOnboardingFormValues(parsed as Partial<OnboardingPreferencesFormValues>);
  } catch {
    return null;
  }
}

function writeDraft(key: string, values: OnboardingPreferencesFormValues) {
  window.localStorage.setItem(key, JSON.stringify(values));
}

export default function OnboardingPreferencesForm({
  initialValues,
  submitLabel,
  redirectTo,
  draftStorageKey,
}: OnboardingPreferencesFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<OnboardingPreferencesFormValues>(() => ({
    ...DEFAULT_ONBOARDING_FORM_VALUES,
    ...normalizeOnboardingFormValues(initialValues),
    ...(draftStorageKey ? readDraft(draftStorageKey) : null),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialValues) return;
    setValues({
      ...DEFAULT_ONBOARDING_FORM_VALUES,
      ...normalizeOnboardingFormValues(initialValues),
      ...(draftStorageKey ? readDraft(draftStorageKey) : null),
    });
  }, [initialValues, draftStorageKey]);

  function updateValues(
    updater: (previous: OnboardingPreferencesFormValues) => OnboardingPreferencesFormValues,
  ) {
    setValues((previous) => {
      const next = updater(previous);
      if (draftStorageKey) writeDraft(draftStorageKey, next);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.onboardingRole.trim()) {
      setError("Choose the role you want to practice for.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          onboardingCompany:
            values.onboardingCompany.trim() === "General"
              ? ""
              : values.onboardingCompany.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Failed to save preferences.");
        return;
      }

      if (draftStorageKey) localStorage.removeItem(draftStorageKey);

      if (redirectTo) {
        const safePath =
          redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.includes(":")
            ? redirectTo
            : "/dashboard";
        router.push(safePath);
      }
      router.refresh();
    } catch {
      setError("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <SearchableDropdown
          label="Target role"
          value={values.onboardingRole}
          onChange={(onboardingRole) => updateValues((previous) => ({ ...previous, onboardingRole }))}
          options={ROLES}
          placeholder="e.g. Software Engineer - Backend"
        />
        <SelectDropdown
          label="Experience level"
          value={values.onboardingLevel}
          onChange={(onboardingLevel) => updateValues((previous) => ({ ...previous, onboardingLevel }))}
          options={EXPERIENCE_LEVELS}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SearchableDropdown
          label="Target company"
          value={values.onboardingCompany}
          onChange={(onboardingCompany) =>
            updateValues((previous) => ({ ...previous, onboardingCompany }))
          }
          options={COMPANIES}
          placeholder="e.g. Google, Stripe, or General"
        />
        <SelectDropdown
          label="Primary goal"
          value={values.onboardingGoal}
          onChange={(onboardingGoal) => updateValues((previous) => ({ ...previous, onboardingGoal }))}
          options={INTERVIEW_GOALS}
        />
      </div>

      <SelectDropdown
        label="Default interview type"
        value={values.preferredInterviewType}
        onChange={(preferredInterviewType) =>
          updateValues((previous) => ({
            ...previous,
            preferredInterviewType: preferredInterviewType as InterviewType,
          }))
        }
        options={INTERVIEW_KINDS.map((kind) => ({
          value: kind.value,
          label: kind.label,
          description: kind.description,
        }))}
      />

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex flex-col items-stretch gap-3 pt-2">
        <SendActionButton
          type="submit"
          label={isSaving ? "Saving" : submitLabel}
          sentLabel="Saved"
          loading={isSaving}
          disabled={isSaving}
          fullWidth
        />
      </div>
    </form>
  );
}
