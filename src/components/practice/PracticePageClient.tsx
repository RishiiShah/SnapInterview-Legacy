"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SearchableDropdown from "@/components/SearchableDropdown";
import SelectDropdown from "@/components/SelectDropdown";
import { CATEGORIES, DIFFICULTIES, INTERVIEW_PERSONAS, ROLES, COMPANIES } from "@/data/constants";
import type { Difficulty, InterviewPersona, InterviewType } from "@/lib/interview/domain";
import { getDefaultDifficultyForOnboardingLevel, normalizeOnboardingFormValues } from "@/lib/onboarding/preferences";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import { IconCheckCircle, IconPlay, IconSpinner, IconUploadArrow, IconXMark } from "@/components/ui/icons";

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

  useEffect(() => {
    let cancelled = false;

    const loadDefaults = async () => {
      try {
        const res = await fetch("/api/onboarding", { method: "GET" });
        if (!res.ok) return;

        const data = normalizeOnboardingFormValues(await res.json());
        if (cancelled) return;

        setRole((previous) => previous || data.onboardingRole);
        setCompany((previous) => previous || data.onboardingCompany);
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

  const interviewLengthOptions = [
    { value: "5", label: "Mini (5 questions)" },
    { value: "10", label: "Full (10 questions)" },
    { value: "15", label: "Extended (15 questions)" },
  ];

  async function handleStart() {
    if (!role.trim()) return;
    setStarted(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          company: company || undefined,
          type,
          difficulty,
          persona,
          jobDescription: jobDescription || undefined,
          questionCount: interviewLength,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const message = body?.error || "Could not create session. Please check your inputs and try again.";
        setCreateError(message);
        console.error("Failed to create session", { status: res.status, message });
        setStarted(false);
        return;
      }

      const { id: interviewId } = await res.json();
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
            <div className="rounded-3xl border border-zinc-200/80 bg-linear-to-b from-white via-white to-zinc-50/40 p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Interview Setup</h2>
                  <p className="mt-1 text-xs text-zinc-500">Configure your session before starting.</p>
                </div>
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Personalized
                </span>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Core Details</p>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div>
                      <SearchableDropdown
                        label="Role / Position"
                        value={role}
                        onChange={setRole}
                        options={ROLES}
                        placeholder="Search or type role"
                      />
                      {!trimmedRole && <p className="mt-1 text-[11px] text-zinc-500">Required to start the interview.</p>}
                    </div>

                    <SearchableDropdown
                      label="Company"
                      value={company}
                      onChange={setCompany}
                      options={COMPANIES}
                      placeholder="Search or type company"
                      isOptional
                    />

                    <SelectDropdown
                      label="Interviewer Persona"
                      value={persona}
                      onChange={(val) => setPersona(val as InterviewPersona)}
                      options={INTERVIEW_PERSONAS.map((item) => ({ value: item.value, label: item.label }))}
                    />

                    <div className="sm:col-span-3">
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                        <SelectDropdown
                          label="Interview Type"
                          value={type}
                          onChange={(val) => setType(val as InterviewType)}
                          options={CATEGORIES}
                        />

                        <SelectDropdown
                          label="Interview Length"
                          value={String(interviewLength)}
                          onChange={(val) => setInterviewLength(Number(val) as 5 | 10 | 15)}
                          options={interviewLengthOptions}
                        />

                        <SelectDropdown
                          label="Difficulty"
                          value={difficulty}
                          onChange={(val) => setDifficulty(val as Difficulty)}
                          options={DIFFICULTIES}
                        />

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                            Resume <span className="text-zinc-400 font-normal">(optional)</span>
                          </label>
                          <div className="flex h-9.5 items-center">
                            {!resumeName ? (
                              <label className="flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-900">
                                <IconUploadArrow className="h-4 w-4" />
                                Upload PDF
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setResumeName(file.name);
                                  }}
                                />
                              </label>
                            ) : (
                              <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-300">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <IconCheckCircle className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                                  <span className="max-w-30 truncate">{resumeName}</span>
                                </div>
                                <button onClick={() => setResumeName("")} className="shrink-0 cursor-pointer rounded-md p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Remove file">
                                  <IconXMark className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-medium text-zinc-700">
                          Job Description <span className="text-zinc-400 font-normal">(optional)</span>
                        </label>
                        <span className="text-[11px] text-zinc-400">{jdChars}/2000</span>
                      </div>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        maxLength={2000}
                        placeholder="Paste the job description here to tailor the interview..."
                        className="h-32 w-full resize-none overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                      />
                    </div>
                  </div>
                </div>
                </div>
              {createError && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={!role.trim() || started}
                className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {started ? (
                  <>
                    <IconSpinner className="h-4 w-4 animate-spin" />
                    Preparing interview…
                  </>
                ) : (
                  <>
                    <IconPlay className="h-4 w-4" />
                    Start Interview
                  </>
                )}
              </button>
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
