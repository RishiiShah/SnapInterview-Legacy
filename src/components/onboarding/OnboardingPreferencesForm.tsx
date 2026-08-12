"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  title?: string;
  description?: string;
  showInterviewTypeField?: boolean;
  redirectTo?: string;
  onSaved?: () => void;
  /** Settings uses dark card; onboarding auth shell uses plain. */
  tone?: "light" | "dark";
  chrome?: "card" | "plain";
  /** Persist unsaved edits across reloads (settings). Cleared after successful save. */
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
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

function clearDraft(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export default function OnboardingPreferencesForm({
  initialValues,
  submitLabel,
  title,
  description,
  showInterviewTypeField = true,
  redirectTo,
  onSaved,
  tone = "light",
  chrome = "card",
  draftStorageKey,
}: OnboardingPreferencesFormProps) {
  const router = useRouter();
  const dark = tone === "dark";
  const plain = chrome === "plain";
  const [values, setValues] = useState<OnboardingPreferencesFormValues>(() => {
    const draft = draftStorageKey ? readDraft(draftStorageKey) : null;
    return {
      ...DEFAULT_ONBOARDING_FORM_VALUES,
      ...normalizeOnboardingFormValues(initialValues),
      ...draft,
    };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateValues(
    updater: (previous: OnboardingPreferencesFormValues) => OnboardingPreferencesFormValues,
  ) {
    setValues((previous) => {
      const next = updater(previous);
      if (draftStorageKey) {
        writeDraft(draftStorageKey, next);
      }
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
          // Blank company stores as null → UI shows General
          onboardingCompany: values.onboardingCompany.trim() === "General"
            ? ""
            : values.onboardingCompany.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Failed to save preferences.");
        return;
      }

      if (draftStorageKey) {
        clearDraft(draftStorageKey);
      }

      onSaved?.();

      if (redirectTo) {
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
    } catch {
      setError("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className={plain ? "space-y-5" : "space-y-6 px-8 py-6"}>
      <div className="grid gap-5 md:grid-cols-2">
        <SearchableDropdown
          label="Target role"
          value={values.onboardingRole}
          onChange={(onboardingRole) => updateValues((previous) => ({ ...previous, onboardingRole }))}
          options={ROLES}
          placeholder="Search or type your target role"
          tone={tone}
        />

        <SelectDropdown
          label="Experience level"
          value={values.onboardingLevel}
          onChange={(onboardingLevel) => updateValues((previous) => ({ ...previous, onboardingLevel }))}
          options={EXPERIENCE_LEVELS}
          tone={tone}
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
          placeholder="Company, or General"
          tone={tone}
        />

        <SelectDropdown
          label="Primary goal"
          value={values.onboardingGoal}
          onChange={(onboardingGoal) => updateValues((previous) => ({ ...previous, onboardingGoal }))}
          options={INTERVIEW_GOALS}
          tone={tone}
        />
      </div>

      {showInterviewTypeField ? (
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
          tone={tone}
        />
      ) : null}

      {error ? (
        <p className={`text-sm ${dark ? "text-rose-400" : "text-red-600"}`}>{error}</p>
      ) : null}

      <div
        className={
          plain
            ? "flex flex-col items-stretch gap-3 pt-2"
            : `flex items-center gap-3 border-t pt-5 ${dark ? "border-white/[0.06]" : "border-zinc-100"}`
        }
      >
        <SendActionButton
          type="submit"
          label={isSaving ? "Saving" : submitLabel}
          sentLabel="Saved"
          loading={isSaving}
          disabled={isSaving}
          fullWidth={plain}
        />
      </div>
    </form>
  );

  if (plain) {
    return form;
  }

  return (
    <div
      className={
        dark
          ? "rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          : "rounded-2xl border border-zinc-200 bg-white shadow-sm"
      }
    >
      {title || description ? (
        <div className={`border-b px-8 py-6 ${dark ? "border-white/[0.06]" : "border-zinc-100"}`}>
          {title ? (
            <h2 className={`text-xl font-semibold ${dark ? "text-[#F2F4F8]" : "text-zinc-900"}`}>
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-[#A8B0C2]" : "text-zinc-700"}`}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {form}
    </div>
  );
}
