"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SearchableDropdown from "@/components/SearchableDropdown";
import SelectDropdown from "@/components/SelectDropdown";
import { ClipButton } from "@/components/ui/ClipButton";
import { COMPANIES, EXPERIENCE_LEVELS, INTERVIEW_GOALS, CATEGORIES, ROLES } from "@/data/constants";
import type { InterviewType } from "@/data/types";
import {
  DEFAULT_ONBOARDING_FORM_VALUES,
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
};

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
}: OnboardingPreferencesFormProps) {
  const router = useRouter();
  const dark = tone === "dark";
  const plain = chrome === "plain";
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

      setSaved(true);
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
      setTimeout(() => setSaved(false), 2000);
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
          onChange={(onboardingRole) => setValues((previous) => ({ ...previous, onboardingRole }))}
          options={ROLES}
          placeholder="Search or type your target role"
          tone={tone}
        />

        <SelectDropdown
          label="Experience level"
          value={values.onboardingLevel}
          onChange={(onboardingLevel) => setValues((previous) => ({ ...previous, onboardingLevel }))}
          options={EXPERIENCE_LEVELS}
          tone={tone}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SearchableDropdown
          label="Target company"
          value={values.onboardingCompany}
          onChange={(onboardingCompany) => setValues((previous) => ({ ...previous, onboardingCompany }))}
          options={COMPANIES}
          placeholder="Company, or General"
          tone={tone}
        />

        <SelectDropdown
          label="Primary goal"
          value={values.onboardingGoal}
          onChange={(onboardingGoal) => setValues((previous) => ({ ...previous, onboardingGoal }))}
          options={INTERVIEW_GOALS}
          tone={tone}
        />
      </div>

      {showInterviewTypeField ? (
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
        <ClipButton type="submit" loading={isSaving} disabled={isSaving} fullWidth={plain}>
          {isSaving ? "Saving…" : submitLabel}
        </ClipButton>
        {saved ? (
          <span className={`text-sm ${dark ? "text-emerald-400" : "text-emerald-600"}`}>Saved</span>
        ) : null}
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
