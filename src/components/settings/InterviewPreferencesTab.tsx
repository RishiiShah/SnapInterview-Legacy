"use client";

import { useState } from "react";
import OnboardingPreferencesForm from "@/components/onboarding/OnboardingPreferencesForm";
import type { OnboardingPreferencesFormValues } from "@/lib/onboarding/preferences";

const MUTE_STORAGE_KEY = "tts_muted";
const SPEED_STORAGE_KEY = "tts_speed";

const SPEED_OPTIONS = [
  { value: "slow" as const, label: "Slow", desc: "0.85×" },
  { value: "normal" as const, label: "Normal", desc: "1.05×" },
  { value: "fast" as const, label: "Fast", desc: "1.25×" },
];

type SpeedValue = (typeof SPEED_OPTIONS)[number]["value"];

type InterviewPreferencesTabProps = {
  initialValues: Partial<OnboardingPreferencesFormValues>;
};

export default function InterviewPreferencesTab({ initialValues }: InterviewPreferencesTabProps) {
  const formKey = JSON.stringify({
    onboardingRole: initialValues.onboardingRole ?? "",
    onboardingLevel: initialValues.onboardingLevel ?? "",
    onboardingCompany: initialValues.onboardingCompany ?? "",
    onboardingGoal: initialValues.onboardingGoal ?? "",
    preferredInterviewType: initialValues.preferredInterviewType ?? "",
  });
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  });
  const [speed, setSpeed] = useState<SpeedValue>(() => {
    if (typeof window === "undefined") return "normal";
    const stored = localStorage.getItem(SPEED_STORAGE_KEY);
    return stored === "slow" || stored === "normal" || stored === "fast" ? stored : "normal";
  });

  function handleMuteToggle() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
  }

  function handleSpeedChange(value: SpeedValue) {
    setSpeed(value);
    localStorage.setItem(SPEED_STORAGE_KEY, value);
  }

  return (
    <div className="space-y-4">
      <OnboardingPreferencesForm
        key={formKey}
        initialValues={initialValues}
        submitLabel="Save interview preferences"
        title="Interview Preferences"
        description="Keep your target role and practice defaults up to date."
      />

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-8 py-6">
          <h2 className="text-xl font-semibold text-zinc-900">AI Voice</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Control whether the AI interviewer speaks and how fast.
          </p>
        </div>
        <div className="divide-y divide-zinc-100">
          <div className="flex items-center justify-between px-8 py-5">
            <div>
              <p className="text-sm font-medium text-zinc-900">AI voice</p>
              <p className="text-xs text-zinc-500 mt-0.5">Read questions aloud during interviews</p>
            </div>
            <button
              onClick={handleMuteToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                muted ? "bg-zinc-200" : "bg-zinc-900"
              }`}
              role="switch"
              aria-checked={!muted}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                  muted ? "translate-x-0" : "translate-x-5"
                }`}
              />
            </button>
          </div>
          <div className={`px-8 py-5 ${muted ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-sm font-medium text-zinc-900 mb-3">Speaking speed</p>
            <div className="grid grid-cols-3 gap-3">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSpeedChange(option.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-4 transition-all ${
                  speed === option.value
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className={`text-xs ${speed === option.value ? "text-white/60" : "text-zinc-400"}`}>
                  {option.desc}
                </span>
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
