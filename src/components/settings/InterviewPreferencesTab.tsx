"use client";

import { useState } from "react";
import OnboardingPreferencesForm from "@/components/onboarding/OnboardingPreferencesForm";
import type { OnboardingPreferencesFormValues } from "@/lib/onboarding/preferences";

const MUTE_STORAGE_KEY = "tts_muted";
const SPEED_STORAGE_KEY = "tts_speed";
const PREFS_DRAFT_STORAGE_KEY = "settings_interview_prefs_draft";

const SPEED_OPTIONS = [
  { value: "slow" as const, label: "Slow", desc: "0.85×" },
  { value: "normal" as const, label: "Normal", desc: "1.05×" },
  { value: "fast" as const, label: "Fast", desc: "1.25×" },
];

type SpeedValue = (typeof SPEED_OPTIONS)[number]["value"];

type InterviewPreferencesTabProps = {
  initialValues: Partial<OnboardingPreferencesFormValues>;
  isLoaded?: boolean;
};

export default function InterviewPreferencesTab({
  initialValues,
  isLoaded = true,
}: InterviewPreferencesTabProps) {
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
    <div className="space-y-12">
      <div>
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">Interview preferences</h2>
        <p className="mt-1.5 mb-8 text-sm text-[#A8B0C2]">
          Keep your target role and practice defaults up to date.
        </p>
        {isLoaded ? (
          <OnboardingPreferencesForm
            key={JSON.stringify(initialValues)}
            initialValues={initialValues}
            submitLabel="Save interview preferences"
            tone="dark"
            chrome="plain"
            draftStorageKey={PREFS_DRAFT_STORAGE_KEY}
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="h-14 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="h-14 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="h-14 animate-pulse rounded bg-white/[0.04]" />
          </div>
        )}
      </div>

      <section className="border-t border-white/[0.06] pt-10">
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">AI voice</h2>
        <p className="mt-1.5 text-sm text-[#A8B0C2]">
          Control whether the AI interviewer speaks and how fast.
        </p>

        <div className="mt-6 divide-y divide-white/[0.06]">
          <div className="flex items-center justify-between gap-3 py-4 first:pt-0">
            <div>
              <p className="text-sm font-medium text-[#E8ECF4]">AI voice</p>
              <p className="mt-0.5 text-xs text-[#A8B0C2]">Read questions aloud during interviews</p>
            </div>
            <button
              type="button"
              onClick={handleMuteToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 ${
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

          <div className={`py-4 ${muted ? "pointer-events-none opacity-40" : ""}`}>
            <p className="mb-3 text-sm font-medium text-[#E8ECF4]">Speaking speed</p>
            <div
              role="radiogroup"
              aria-label="Speaking speed"
              className="grid grid-cols-3 gap-2"
            >
              {SPEED_OPTIONS.map((option) => {
                const selected = speed === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSpeedChange(option.value)}
                    className={`cursor-pointer rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 ${
                      selected
                        ? "border-[#3B82F6]/50 bg-[#3B82F6]/10"
                        : "border-white/[0.08] bg-transparent hover:border-white/[0.14] hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`block text-sm font-medium ${
                        selected ? "text-[#F2F4F8]" : "text-[#C5CBD8]"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span
                      className={`mt-0.5 block font-mono text-[11px] ${
                        selected ? "text-[#93C5FD]" : "text-[#6B7385]"
                      }`}
                    >
                      {option.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
