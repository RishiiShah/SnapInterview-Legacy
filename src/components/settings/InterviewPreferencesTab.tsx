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
        tone="dark"
      />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <h2 className="text-xl font-semibold text-[#F2F4F8]">AI Voice</h2>
          <p className="mt-1 text-sm text-[#A8B0C2]">
            Control whether the AI interviewer speaks and how fast.
          </p>
        </div>
        <div className="divide-y divide-white/[0.06]">
          <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm font-medium text-[#E8ECF4]">AI voice</p>
              <p className="mt-0.5 text-xs text-[#A8B0C2]">Read questions aloud during interviews</p>
            </div>
            <button
              onClick={handleMuteToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                muted ? "bg-white/[0.12]" : "bg-[#3B82F6]"
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
          <div className={`px-4 py-5 sm:px-6 lg:px-8 ${muted ? "pointer-events-none opacity-40" : ""}`}>
            <p className="mb-3 text-sm font-medium text-[#E8ECF4]">Speaking speed</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSpeedChange(option.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-4 transition-all ${
                    speed === option.value
                      ? "border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#93C5FD]"
                      : "border-white/[0.08] bg-white/[0.02] text-[#C5CBD8] hover:bg-white/[0.05] hover:text-[#E8ECF4]"
                  }`}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className={`text-xs ${speed === option.value ? "text-[#93C5FD]/70" : "text-[#A8B0C2]"}`}>
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
