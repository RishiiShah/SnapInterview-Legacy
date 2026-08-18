"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import SearchableDropdown from "@/components/SearchableDropdown";
import SelectDropdown from "@/components/SelectDropdown";
import {
  INTERVIEW_KINDS,
  INTERVIEW_PERSONAS,
  ROLES,
  COMPANIES,
} from "@/data/constants";
import type { InterviewPersona, InterviewType } from "@/lib/interview/domain";
import {
  normalizeOnboardingFormValues,
} from "@/lib/onboarding/preferences";
import type { OnboardingPreferencesFormValues } from "@/lib/onboarding/preferences";
import type { PracticeRetakeDefaults } from "@/lib/practice/retake-defaults";
import { extractResumeHighlights } from "@/lib/interview/resume-highlights";
import { IconPlay, IconSpinner, IconXMark } from "@/components/ui/icons";
import { isLocalTtsEnabled } from "@/lib/tts/browser-tts";
import { getSharedKokoroWorkerClient } from "@/lib/tts/kokoro-worker-client";
import ResumeDocumentModal from "@/components/resume/ResumeDocumentModal";
import {
  MAX_RESUME_PDF_LABEL,
  uploadResumeFile,
  validateResumeFile,
} from "@/lib/resume-upload";

type PracticePageClientProps = {
  retakeDefaults?: PracticeRetakeDefaults;
  initialDefaults?: {
    onboarding: OnboardingPreferencesFormValues;
    resumeText: string | null;
  };
};

const LEVEL_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "entry-level", label: "Intern / Entry Level", description: "CS fundamentals, code clarity & learning agility" },
  { value: "mid-level", label: "Mid Level", description: "Independent execution, design patterns & debugging" },
  { value: "senior", label: "Senior", description: "Scalability, failure modes, trade-offs & edge cases" },
  { value: "staff-plus", label: "Staff+ / Lead", description: "Ambiguous architecture, organizational strategy & risk" },
  // Backward compatibility options
  { value: "easy", label: "Entry Level", description: "CS fundamentals & code clarity" },
  { value: "medium", label: "Mid / Senior Level", description: "Core architecture & edge cases" },
  { value: "hard", label: "Staff+ / Expert", description: "Complex scaling & failure modes" },
];

const FORMAT_OPTIONS: { value: 15 | 30 | 45; label: string; shortLabel: string; description: string }[] = [
  { value: 15, label: "Quick Screen (15 min)", shortLabel: "15 min", description: "15 minutes · Baseline alignment & initial technical probe" },
  { value: 30, label: "Technical Round (30 min)", shortLabel: "30 min", description: "30 minutes · 2 cohesive topic pillars with deep follow-ups" },
  { value: 45, label: "Onsite Deep Dive (45 min)", shortLabel: "45 min", description: "45 minutes · Multi-pillar architecture & scaling stress tests" },
];

export default function PracticePageClient({
  retakeDefaults,
  initialDefaults,
}: PracticePageClientProps) {
  const router = useRouter();
  const retakeRole = retakeDefaults?.role ?? "";
  const retakeType = retakeDefaults?.type;
  const retakeDifficulty = retakeDefaults?.difficulty;
  const onboardingDefaults = initialDefaults?.onboarding;
  const [role, setRole] = useState(retakeRole || onboardingDefaults?.onboardingRole || "");
  const [company, setCompany] = useState(
    retakeRole ? "" : onboardingDefaults?.onboardingCompany || "",
  );
  const [type, setType] = useState<InterviewType>(
    retakeType ?? onboardingDefaults?.preferredInterviewType ?? "behavioral-leadership",
  );
  const [difficulty, setDifficulty] = useState<string>(
    retakeDifficulty ?? onboardingDefaults?.onboardingLevel ?? "mid-level",
  );
  const [persona, setPersona] = useState<InterviewPersona>("balanced");
  const [durationMinutes, setDurationMinutes] = useState<15 | 30 | 45>(30);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeName, setResumeName] = useState(initialDefaults?.resumeText ? "Saved resume" : "");
  const [resumeText, setResumeText] = useState(initialDefaults?.resumeText ?? "");
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  // Skip the first entrance animation so real content replaces the route skeleton in place.
  const [animateStepTransitions, setAnimateStepTransitions] = useState(false);

  const resumeHighlights = useMemo(() => extractResumeHighlights(resumeText), [resumeText]);
  const selectedKind = INTERVIEW_KINDS.find((kind) => kind.value === type);
  const selectedPersona = INTERVIEW_PERSONAS.find((item) => item.value === persona);
  const selectedLevel = LEVEL_OPTIONS.find((item) => item.value === difficulty) ?? LEVEL_OPTIONS[1];
  const selectedFormat = FORMAT_OPTIONS.find((item) => item.value === durationMinutes) ?? FORMAT_OPTIONS[1];
  const trimmedRole = role.trim();
  const jdChars = jobDescription.length;
  const hasResume = Boolean(resumeName && resumeText);

  const sessionBrief = useMemo(() => {
    const parts: string[] = [];
    if (trimmedRole) parts.push(trimmedRole);
    if (company.trim()) parts.push(company.trim());
    parts.push(selectedKind?.shortLabel ?? selectedKind?.label ?? type);
    parts.push(selectedLevel?.label ?? difficulty);
    parts.push(selectedFormat?.shortLabel ?? `${durationMinutes} min`);
    return parts.join(" · ");
  }, [trimmedRole, company, selectedKind, type, selectedLevel, difficulty, selectedFormat, durationMinutes]);

  useEffect(() => {
    let cancelled = false;

    const activeId = localStorage.getItem("active_interview_id");
    if (activeId) {
      localStorage.removeItem("active_interview_id");
      fetch(`/api/interview/session?interviewId=${activeId}`, {
        method: "DELETE",
      }).catch((err) => console.error("Failed to delete abandoned session", err));
    }

    const loadDefaults = async () => {
      try {
        const [onboardingRes, resumeRes] = await Promise.all([
          fetch("/api/onboarding", { method: "GET" }),
          fetch("/api/resume", { method: "GET" }),
        ]);

        if (cancelled) return;

        if (onboardingRes.ok) {
          const data = normalizeOnboardingFormValues(await onboardingRes.json());
          if (!cancelled) {
            if (!retakeRole) {
              setRole((previous) => (previous === "" || !previous ? data.onboardingRole : previous));
            }
            if (!retakeRole) {
              setCompany((previous) =>
                previous === "" || !previous ? data.onboardingCompany : previous,
              );
            }
            if (!retakeType) {
              setType((previous) =>
                previous === "behavioral-leadership" ? data.preferredInterviewType : previous,
              );
            }
            if (!retakeDifficulty) {
              setDifficulty((previous) => {
                if (previous !== "mid-level" && previous !== "medium") return previous;
                return data.onboardingLevel || "mid-level";
              });
            }
          }
        }

        if (resumeRes.ok) {
          const resumeData = (await resumeRes.json()) as { resumeText: string | null };
          if (!cancelled && resumeData.resumeText) {
            setResumeText(resumeData.resumeText);
            setResumeName("Saved resume");
          }
        }
      } catch {
        // Keep defaults when fetches fail.
      }
    };

    if (!initialDefaults) {
      void loadDefaults();
    }

    return () => {
      cancelled = true;
    };
  }, [initialDefaults, retakeDifficulty, retakeRole, retakeType]);

  async function handleResumeUpload(file: File) {
    const fileError = validateResumeFile(file);
    if (fileError) {
      setResumeError(fileError);
      return;
    }

    setResumeName(file.name);
    setResumeUploading(true);
    setResumeError(null);
    setResumeText("");

    try {
      setResumeText(await uploadResumeFile(file));
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to process resume");
      setResumeName("");
    } finally {
      setResumeUploading(false);
    }
  }

  async function handleStart() {
    if (!role.trim()) return;
    setStarted(true);
    setCreateError(null);

    try {
      if (isLocalTtsEnabled()) {
        void getSharedKokoroWorkerClient().preload().catch(() => {
          // The pre-join room presents a recovery message if Kokoro cannot load.
        });
      }
      const interviewId = crypto.randomUUID();
      const payload = {
        role,
        company: company || undefined,
        type,
        difficulty,
        persona,
        jobDescription: jobDescription || undefined,
        durationMinutes,
        questionCount: durationMinutes === 15 ? 5 : durationMinutes === 45 ? 15 : 10,
        resumeText: resumeText || undefined,
      };

      sessionStorage.setItem(`pending_interview_${interviewId}`, JSON.stringify(payload));
      router.push(`/interview/${interviewId}`);
    } catch (err) {
      console.error("Error creating interview session:", err);
      setCreateError("Something went wrong while creating your interview. Please try again.");
      setStarted(false);
    }
  }

  function goNext() {
    if (step === 1 && !trimmedRole) return;
    if (step < 2) {
      setAnimateStepTransitions(true);
      setStep(2);
    }
  }

  function goBack() {
    if (step > 1) {
      setAnimateStepTransitions(true);
      setStep(1);
    }
  }

  // Enter advances setup when not interacting with a selector menu
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey) return;
      if (step !== 1) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "TEXTAREA") return;
      if (target.closest("[data-practice-selector]")) return;
      if (!role.trim()) return;
      e.preventDefault();
      setAnimateStepTransitions(true);
      setStep(2);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, role]);

  return (
    <div
      data-testid="practice-page"
      className={`mx-auto w-full max-w-4xl xl:max-w-5xl ${step === 2 ? "pb-0 pt-4" : "pb-20 pt-6"}`}
    >
      {/* Soft progress */}
      <div className={`${step === 2 ? "mb-6" : "mb-10"} flex items-center gap-3`}>
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-[11px] tabular-nums text-[#6B7385]">
            {step}/2
          </p>
          <p className="text-[11px] text-[#8B93A7]">
            {step === 1 ? "Setup" : "Context"}
          </p>
        </div>
        <div className="h-px flex-1 bg-white/[0.07]" aria-hidden>
          <div
            className="h-px bg-[#3B82F6]/75 transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={animateStepTransitions ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {/* ─── Step 1: Setup ─── */}
          {step === 1 ? (
            <div className="space-y-12">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-[2.15rem] leading-[1.15] tracking-[-0.03em] text-[#F2F4F8] sm:text-[2.6rem] xl:text-[2.85rem]">
                    Set up your interview
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#93C5FD]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
                    Adaptive Calibration
                  </span>
                </div>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#B4BBC9] xl:text-base">
                  Target role, level, and format first. Context comes next.
                </p>
              </div>

              <div className="space-y-8">
                <SearchableDropdown
                  label="Role"
                  value={role}
                  onChange={setRole}
                  options={ROLES}
                  placeholder="e.g. Software Engineer - Backend"
                  tone="dark"
                />
                <SearchableDropdown
                  label="Company"
                  value={company}
                  onChange={setCompany}
                  options={COMPANIES}
                  placeholder="e.g. Google, Stripe, or General"
                  isOptional
                  tone="dark"
                />

                <div>
                  <SelectDropdown
                    label="Interview kind"
                    value={type}
                    onChange={(value) => setType(value as InterviewType)}
                    options={INTERVIEW_KINDS.map((kind) => ({
                      value: kind.value,
                      label: kind.label,
                      description: kind.description,
                    }))}
                    tone="dark"
                  />
                  {selectedKind ? (
                    <p className="mt-3 text-[14px] leading-relaxed text-[#B4BBC9]">
                      {selectedKind.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <div>
                    <SelectDropdown
                      label="Experience level"
                      value={difficulty}
                      onChange={(value) => setDifficulty(value)}
                      options={LEVEL_OPTIONS.slice(0, 4).map((option) => ({
                        value: option.value,
                        label: option.label,
                        description: option.description,
                      }))}
                      tone="dark"
                    />
                    {selectedLevel ? (
                      <p className="mt-2.5 text-[13px] leading-relaxed text-[#8B93A7]">
                        {selectedLevel.description}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <SelectDropdown
                      label="Duration"
                      value={String(durationMinutes)}
                      onChange={(value) =>
                        setDurationMinutes(Number(value) as 15 | 30 | 45)
                      }
                      options={FORMAT_OPTIONS.map((option) => ({
                        value: String(option.value),
                        label: option.label,
                        description: option.description,
                      }))}
                      tone="dark"
                    />
                    {selectedFormat ? (
                      <p className="mt-2.5 text-[13px] leading-relaxed text-[#8B93A7]">
                        {selectedFormat.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ─── Step 2: Context + start ─── */}
          {step === 2 ? (
            <div data-testid="practice-step-two" className="space-y-8 pb-0">
              <div>
                <h1 className="font-display text-[2.15rem] leading-[1.15] tracking-[-0.03em] text-[#F2F4F8] sm:text-[2.6rem] xl:text-[2.85rem]">
                  Ready when you are
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#B4BBC9] xl:text-base">
                  Add context for accuracy, then start. Resume and job description are recommended.
                </p>
                {sessionBrief ? (
                  <p className="mt-5 font-mono text-[13px] leading-relaxed text-[#8B93A7]">
                    {sessionBrief}
                  </p>
                ) : null}
              </div>

              <div className="space-y-6">
                <div>
                  <SelectDropdown
                    label="Persona"
                    value={persona}
                    onChange={(value) => setPersona(value as InterviewPersona)}
                    options={INTERVIEW_PERSONAS.map((item) => ({
                      value: item.value,
                      label: item.label.replace(/ Interviewer| Coach| Panel/g, ""),
                      description: item.description,
                    }))}
                    tone="dark"
                  />
                  {selectedPersona ? (
                    <p className="mt-3 text-[14px] leading-relaxed text-[#B4BBC9]">
                      {selectedPersona.description}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-[#A8B0C2]">Resume</p>

                  {resumeUploading ? (
                    <div className="flex items-center gap-3 border-b border-white/[0.12] py-2.5">
                      <IconSpinner className="h-4 w-4 animate-spin text-[#A8B0C2]" />
                      <p className="text-[15px] text-[#E8ECF4]">Reading resume…</p>
                    </div>
                  ) : null}

                  {!resumeUploading && resumeError ? (
                    <div className="flex items-center justify-between gap-3 border-b border-rose-500/30 py-2.5">
                      <p className="text-[15px] text-rose-300">{resumeError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeError(null);
                        }}
                        className="cursor-pointer text-sm text-[#C5CBD8] hover:text-[#E8ECF4]"
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!resumeUploading && hasResume ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 border-b border-[#3B82F6]/40 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-[#F2F4F8]">{resumeName}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[#93C5FD]">
                            <button
                              type="button"
                              onClick={() => setResumeModalOpen(true)}
                              className="cursor-pointer font-medium text-[#60A5FA] hover:text-[#93C5FD]"
                            >
                              📄 View document
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer text-xs font-medium text-[#60A5FA] hover:text-[#93C5FD]">
                            Replace
                            <input
                              ref={replaceInputRef}
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleResumeUpload(file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setResumeName("");
                              setResumeText("");
                              setResumeError(null);
                            }}
                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-[#A8B0C2] hover:text-rose-300"
                            aria-label="Remove resume"
                          >
                            <IconXMark className="h-4 w-4" />
                          </button>
                        </div>
                      </div>


                      {resumeHighlights.skills.length > 0 ? (
                        <p className="text-[12px] leading-relaxed text-[#8B93A7]">
                          <span className="text-[#A8B0C2]">Detected skills: </span>
                          {resumeHighlights.skills.slice(0, 8).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {!resumeUploading && !resumeError && !hasResume ? (
                    <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-dashed border-white/[0.14] py-2.5 transition-colors hover:border-[#3B82F6]/55">
                      <span>
                        <span className="block text-[15px] text-[#E8ECF4]">Upload PDF resume</span>
                        <span className="mt-0.5 block text-[12px] text-[#6B7385]">max {MAX_RESUME_PDF_LABEL}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-[#8B93A7]">Recommended</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleResumeUpload(file);
                        }}
                      />
                    </label>
                  ) : null}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label htmlFor="practice-jd" className="text-[12px] font-medium text-[#A8B0C2]">
                      Job description
                    </label>
                    <span className="font-mono text-[11px] text-[#6B7385]">
                      {jdChars}/2000
                    </span>
                  </div>
                  <textarea
                    id="practice-jd"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Paste the posting or key requirements…"
                    className="w-full resize-none border-b border-white/[0.12] bg-transparent py-2.5 text-[15px] leading-relaxed text-[#F2F4F8] placeholder-[#6B7385] outline-none transition-colors focus:border-[#3B82F6]"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {createError ? (
        <div className="mt-8 text-sm text-rose-300">{createError}</div>
      ) : null}

      {step === 1 ? (
        <div className="mt-14 flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#6B7385]">
            {trimmedRole ? (
              <>
                Press{" "}
                <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-[#A8B0C2]">
                  Enter
                </kbd>{" "}
                to continue
              </>
            ) : (
              "Role is required"
            )}
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={!trimmedRole}
            className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Continue
          </button>
        </div>
      ) : (
        <div
          data-testid="practice-step-two-actions"
          className="mt-8 flex items-center justify-between gap-3 pt-5"
        >
          <button
            type="button"
            onClick={goBack}
            className="cursor-pointer text-sm text-[#A8B0C2] transition-colors hover:text-[#E8ECF4]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!trimmedRole || started}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {started ? (
              <>
                <IconSpinner className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <IconPlay className="h-4 w-4 fill-current" />
                Start Interview
              </>
            )}
          </button>
        </div>
      )}

      {resumeText ? (
        <ResumeDocumentModal
          isOpen={resumeModalOpen}
          onClose={() => setResumeModalOpen(false)}
          resumeText={resumeText}
          candidateName={trimmedRole || "Candidate"}
          onReplace={() => replaceInputRef.current?.click()}
        />
      ) : null}
    </div>
  );
}
