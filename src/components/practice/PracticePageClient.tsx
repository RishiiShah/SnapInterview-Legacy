"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import SearchableDropdown from "@/components/SearchableDropdown";
import { CATEGORIES, ROLES, COMPANIES } from "@/data/constants";
import type { Difficulty, InterviewPersona, InterviewType } from "@/lib/interview/domain";
import { getDefaultDifficultyForOnboardingLevel, normalizeOnboardingFormValues } from "@/lib/onboarding/preferences";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import { IconArrowLeft, IconArrowRight, IconCheckCircle, IconPlay, IconSpinner, IconXMark, IconMessage, IconCode, IconLayout, IconActivity, IconZap, IconGem, IconUserCheck, IconStarBurst, IconFlame, IconClock, IconBriefcase, IconBuilding } from "@/components/ui/icons";
import { ChoiceCard } from "@/components/ui/ChoiceCard";

type RecentPracticeSession = {
  id: string;
  role: string;
  company: string;
  type: InterviewType;
  score: number;
  date: string;
};

type PracticePageClientProps = {
  recentPractice: RecentPracticeSession[];
};

export default function PracticePageClient({ recentPractice }: PracticePageClientProps) {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState<InterviewType>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [persona, setPersona] = useState<InterviewPersona>("balanced");
  const [interviewLength, setInterviewLength] = useState<5 | 10 | 15>(10);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [started, setStarted] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    let cancelled = false;
    
    // Clear any active interview session so a new one is always started
    const activeId = localStorage.getItem("active_interview_id");
    if (activeId) {
      localStorage.removeItem("active_interview_id");
      // Hard delete abandoned interview from database
      fetch(`/api/interview/session?interviewId=${activeId}`, {
        method: "DELETE",
      }).catch((err) => console.error("Failed to delete abandoned session", err));
    }

    const loadDefaults = async () => {
      try {
        const res = await fetch("/api/onboarding", { method: "GET" });
        if (!res.ok) return;

        const data = normalizeOnboardingFormValues(await res.json());
        if (cancelled) return;

        setRole((previous) => (previous === "" || !previous) ? data.onboardingRole : previous);
        setCompany((previous) => (previous === "" || !previous) ? data.onboardingCompany : previous);
        setType((previous) => previous === "behavioral" ? data.preferredInterviewType : previous);
        setDifficulty((previous) => {
          if (previous !== "medium") return previous;

          return getDefaultDifficultyForOnboardingLevel(data.onboardingLevel);
        });
      } catch {
        // Keep defaults when onboarding fetch fails.
      }
    };

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    if (!role.trim()) return;
    setStarted(true);
    setCreateError(null);

    try {
      const interviewId = crypto.randomUUID();
      const payload = {
        role,
        company: company || undefined,
        type,
        difficulty,
        persona,
        jobDescription: jobDescription || undefined,
        questionCount: interviewLength,
      };

      // Defer DB creation: store config and pass ID to route
      sessionStorage.setItem(`pending_interview_${interviewId}`, JSON.stringify(payload));
      router.push(`/interview/${interviewId}`);
    } catch (err) {
      console.error("Error creating interview session:", err);
      setCreateError("Something went wrong while creating your interview. Please try again.");
      setStarted(false);
    }
  }

  const trimmedRole = role.trim();
  const jdChars = jobDescription.length;

  return (
    <>
      <div className="mx-auto w-full max-w-350 space-y-8 pb-8">
        <SlideIn>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Practice Interview</h1>
            <p className="mt-1 text-sm text-zinc-500">Set up your mock interview and start practicing.</p>
          </div>
        </SlideIn>

        <div className="grid gap-8 xl:grid-cols-3">
          <FadeIn delay={0.2} direction="up" className="space-y-6 xl:col-span-2">
            <div className="rounded-3xl border border-zinc-200/80 bg-linear-to-b from-white via-white to-zinc-50/40 p-8 shadow-sm">
              <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {step === 1 && "Interview Basics"}
                    {step === 2 && "Interview Format"}
                    {step === 3 && "Interviewer Style"}
                    {step === 4 && "Final Context"}
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    {step === 1 && "Start by identifying the role and organization."}
                    {step === 2 && "Choose your category and challenge level."}
                    {step === 3 && "Tailor the interviewer personality and length."}
                    {step === 4 && "Add details to make the questions hyper-relevant."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${s < step
                            ? "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                            : s === step
                              ? "border-sky-500 bg-white text-sky-600 ring-4 ring-sky-50"
                              : "border-zinc-200 bg-white text-zinc-400"
                          }`}
                      >
                        {s < step ? (
                          <IconCheckCircle className="h-5 w-5" strokeWidth={3} />
                        ) : (
                          <span className="text-xs font-bold">{s}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${s === step ? "text-sky-600" : "text-zinc-400"}`}>
                        {s === 1 && "Role"}
                        {s === 2 && "Type"}
                        {s === 3 && "Vibe"}
                        {s === 4 && "Context"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-[340px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mx-auto max-w-2xl"
                  >
                    {step === 1 && (
                      <div className="space-y-10 pt-4">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100">
                              <IconBriefcase className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-sm font-bold text-zinc-900">Target Role</label>
                              <span className="text-[11px] font-medium text-zinc-500">What position are you preparing for?</span>
                            </div>
                          </div>
                          <SearchableDropdown
                            label=""
                            value={role}
                            onChange={setRole}
                            options={ROLES}
                            placeholder="Search or type your target role..."
                          />
                        </div>

                        <div className="space-y-6 border-t border-zinc-100 pt-8">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm ring-1 ring-amber-100">
                              <IconBuilding className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-sm font-bold text-zinc-900">
                                Target Company <span className="ml-1 text-[11px] font-normal text-zinc-400">(Optional)</span>
                              </label>
                              <span className="text-[11px] font-medium text-zinc-500">Tailor scenarios for a specific company</span>
                            </div>
                          </div>
                          <SearchableDropdown
                            label=""
                            value={company}
                            onChange={setCompany}
                            options={COMPANIES}
                            placeholder="Which company are you interviewing with?"
                            isOptional
                          />
                        </div>

                        {!trimmedRole && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center gap-2 pt-4 text-[11px] font-bold text-sky-600"
                          >
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                            Select a role to unlock your path
                          </motion.p>
                        )}
                      </div>
                    )}

                    {step === 2 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 pt-2">
                        <div className="space-y-5">
                          <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            Category
                          </label>
                          <div className="grid grid-cols-1 gap-3">
                            <ChoiceCard
                              compact
                              title="Behavioral"
                              icon={<IconMessage className="h-5 w-5" />}
                              selected={type === "behavioral"}
                              onClick={() => setType("behavioral")}
                            />
                            <ChoiceCard
                              compact
                              title="Technical"
                              icon={<IconCode className="h-5 w-5" />}
                              selected={type === "technical"}
                              onClick={() => setType("technical")}
                            />
                            <ChoiceCard
                              compact
                              title="System Design"
                              icon={<IconLayout className="h-5 w-5" />}
                              selected={type === "system-design"}
                              onClick={() => setType("system-design")}
                            />
                            <ChoiceCard
                              compact
                              title="Leadership"
                              icon={<IconUserCheck className="h-5 w-5" />}
                              selected={type === "leadership"}
                              onClick={() => setType("leadership")}
                              iconColor="text-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-5">
                          <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            Difficulty
                          </label>
                          <div className="grid grid-cols-1 gap-3">
                            <ChoiceCard
                              compact
                              title="Easy"
                              icon={<IconActivity className="h-5 w-5" />}
                              selected={difficulty === "easy"}
                              onClick={() => setDifficulty("easy")}
                              iconColor="text-emerald-500"
                            />
                            <ChoiceCard
                              compact
                              title="Medium"
                              icon={<IconZap className="h-5 w-5" />}
                              selected={difficulty === "medium"}
                              onClick={() => setDifficulty("medium")}
                              iconColor="text-amber-500"
                            />
                            <ChoiceCard
                              compact
                              title="Hard"
                              icon={<IconGem className="h-5 w-5" />}
                              selected={difficulty === "hard"}
                              onClick={() => setDifficulty("hard")}
                              iconColor="text-red-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 pt-2">
                        <div className="space-y-5">
                          <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            Persona
                          </label>
                          <div className="grid grid-cols-1 gap-3">
                            <ChoiceCard
                              compact
                              title="Friendly"
                              icon={<IconStarBurst className="h-5 w-5" />}
                              selected={persona === "friendly"}
                              onClick={() => setPersona("friendly")}
                              iconColor="text-pink-500"
                            />
                            <ChoiceCard
                              compact
                              title="Balanced"
                              icon={<IconActivity className="h-5 w-5" />}
                              selected={persona === "balanced"}
                              onClick={() => setPersona("balanced")}
                              iconColor="text-sky-500"
                            />
                            <ChoiceCard
                              compact
                              title="Strict"
                              icon={<IconFlame className="h-5 w-5" />}
                              selected={persona === "strict"}
                              onClick={() => setPersona("strict")}
                              iconColor="text-orange-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-5">
                          <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            Session Length
                          </label>
                          <div className="grid grid-cols-1 gap-3">
                            <ChoiceCard
                              compact
                              title="Mini (5 Questions)"
                              icon={<IconClock className="h-5 w-5" />}
                              selected={interviewLength === 5}
                              onClick={() => setInterviewLength(5)}
                            />
                            <ChoiceCard
                              compact
                              title="Full (10 Questions)"
                              icon={<IconClock className="h-5 w-5" />}
                              selected={interviewLength === 10}
                              onClick={() => setInterviewLength(10)}
                            />
                            <ChoiceCard
                              compact
                              title="Deep Dive (15 Questions)"
                              icon={<IconClock className="h-5 w-5" />}
                              selected={interviewLength === 15}
                              onClick={() => setInterviewLength(15)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="space-y-6 pt-4">
                        <div className="space-y-3">
                          <label className="px-1 text-[13px] font-bold text-zinc-900">Resume Context</label>
                          {!resumeName ? (
                            <motion.label
                              whileHover="hover"
                              className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-2 pr-4 transition-all hover:border-sky-400 hover:bg-white hover:shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-colors group-hover:bg-sky-50 group-hover:ring-sky-100">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" className="opacity-40" />
                                    <motion.g variants={{ hover: { y: -3 } }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                                      <polyline points="17 8 12 3 7 8" />
                                      <line x1="12" x2="12" y1="3" y2="15" />
                                    </motion.g>
                                  </svg>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-zinc-900 transition-colors group-hover:text-sky-700">Upload your Resume</span>
                                  <span className="text-[11px] font-medium text-zinc-500">PDF or Word (max 5MB)</span>
                                </div>
                              </div>
                              <div className="rounded-lg bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-sky-600 shadow-sm ring-1 ring-zinc-200 transition-all group-hover:bg-sky-50 group-hover:ring-sky-200">
                                Browse
                              </div>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setResumeName(file.name);
                                }}
                              />
                            </motion.label>
                          ) : (
                            <div className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-2 pr-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                                  <IconCheckCircle className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate text-[13px] font-bold text-sky-900">{resumeName}</span>
                                  <span className="text-[11px] font-medium text-sky-600">Successfully attached</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setResumeName("")}
                                className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-red-50 hover:text-red-500 hover:ring-red-200"
                              >
                                <IconXMark className="h-4 w-4 transition-transform group-hover:scale-110" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[13px] font-bold text-zinc-900">
                              Job Description <span className="ml-1 font-normal text-zinc-400">(Optional)</span>
                            </label>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              {jdChars} / 2000
                            </span>
                          </div>
                          
                          <div className="group relative">
                            <textarea
                              value={jobDescription}
                              onChange={(e) => setJobDescription(e.target.value)}
                              maxLength={2000}
                              placeholder="Paste the target job requirements or skills here..."
                              className="h-32 w-full resize-none rounded-2xl border-2 border-zinc-200 bg-zinc-50/50 px-5 py-4 text-[13px] leading-relaxed text-zinc-900 placeholder-zinc-400 outline-none transition-all hover:border-indigo-100 hover:bg-white focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                            />
                            {jobDescription.length > 0 && (
                              <div className="absolute bottom-4 right-4 animate-in fade-in zoom-in">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                  <IconCheckCircle className="h-3 w-3" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {createError && (
                <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/30 px-5 py-4 text-sm font-medium text-red-700">
                  ⚠️ {createError}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-8">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <IconArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1.5 px-4 text-[11px] font-bold uppercase tracking-widest text-zinc-300">
                  {step} <span className="opacity-40">/</span> 4
                </div>

                {step < 4 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={!trimmedRole}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl bg-zinc-900 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:translate-y-0"
                  >
                    Continue
                    <IconArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={!trimmedRole || started}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl bg-sky-600 px-10 py-4 text-sm font-bold text-white shadow-xl shadow-sky-600/30 transition-all hover:bg-sky-500 hover:-translate-y-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
                  >
                    {started ? (
                      <>
                        <IconSpinner className="h-5 w-5 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <IconPlay className="h-5 w-5 fill-current" />
                        Start Interview
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </FadeIn>

          <FadeIn
            delay={0.4}
            direction="up"
            className="space-y-4"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-zinc-900">Recent Practice</h3>
              </div>
              {recentPractice.length > 0 ? (
                <FadeInStagger className="divide-y divide-zinc-50">
                  {recentPractice.slice(0, 4).map((session) => {
                    const category = CATEGORIES.find((item) => item.value === session.type);

                    return (
                      <FadeInStaggerItem
                        key={session.id}
                        className="cursor-pointer px-5 py-3.5 transition-colors hover:bg-zinc-50"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/interview/${session.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/interview/${session.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-900">{session.role}</p>
                          <span className="text-sm font-semibold text-zinc-900">
                            {session.score}
                            <span className="text-xs font-normal text-zinc-400">/100</span>
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">{session.company} · {session.date}</p>
                        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${category?.color ?? "bg-zinc-100 text-zinc-600"}`}>
                          {category?.label ?? session.type}
                        </span>
                      </FadeInStaggerItem>
                    );
                  })}
                </FadeInStagger>
              ) : (
                <div className="px-5 py-8 text-center text-sm text-zinc-500">
                  No practice sessions yet. Start your first interview to build history here.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">💡 Pro Tips</h3>
              <ul className="space-y-2 text-xs text-zinc-500">
                <li className="group flex gap-2"><span className="text-zinc-300 transition-colors group-hover:text-amber-400">•</span><span className="transition-colors group-hover:text-zinc-800">Use the STAR method for behavioral questions</span></li>
                <li className="group flex gap-2"><span className="text-zinc-300 transition-colors group-hover:text-amber-400">•</span><span className="transition-colors group-hover:text-zinc-800">Think out loud during technical interviews</span></li>
                <li className="group flex gap-2"><span className="text-zinc-300 transition-colors group-hover:text-amber-400">•</span><span className="transition-colors group-hover:text-zinc-800">Start with high-level design before diving into details</span></li>
                <li className="group flex gap-2"><span className="text-zinc-300 transition-colors group-hover:text-amber-400">•</span><span className="transition-colors group-hover:text-zinc-800">Ask clarifying questions before solving</span></li>
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </>
  );
}
