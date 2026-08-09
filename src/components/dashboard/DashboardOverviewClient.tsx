"use client";

import { useState, useEffect, useId, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getScoreLabel } from "@/utils/helpers";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import RecordingModal from "@/components/recordings/RecordingModal";
import { FlipDate } from "@/components/ui/FlipDate";
import { CompanyMark } from "@/components/ui/CompanyMark";
import { displayCompany } from "@/lib/company-brands";
import { IconPractice } from "@/components/ui/icons";

type StatItem = {
  label: string;
  value: string;
  change: string;
  suffix?: string;
  iconKey: "completed" | "average" | "hours" | "streak";
};

type SessionItem = {
  id: string;
  role: string;
  company: string;
  type?: string | null;
  difficulty?: string | null;
  score: number | null;
  duration: string;
  date: string;
  videoKey: string | null;
};

type DashboardOverviewClientProps = {
  userId: string;
  firstName: string;
  isFirstLogin: boolean;
  stats: StatItem[];
  recentSessions: SessionItem[];
  topStrength: string | null;
  topFocus: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  "recruiter-screen": "Recruiter / screen",
  "behavioral-leadership": "Behavioral / leadership",
  "coding-algorithms": "Coding / algorithms",
  "system-design": "System design",
  "domain-role": "Domain / role-specific",
  "take-home": "Take-home / project",
  "hiring-manager": "Hiring manager",
  "bar-raiser": "Bar raiser / panel",
  behavioral: "Behavioral",
  technical: "Technical",
  leadership: "Leadership",
  coding: "Coding",
};

const TYPE_STYLES: Record<string, string> = {
  "recruiter-screen": "text-sky-300/90 bg-sky-500/10 border-sky-500/20",
  "behavioral-leadership": "text-sky-300/90 bg-sky-500/10 border-sky-500/20",
  "coding-algorithms": "text-teal-300/90 bg-teal-500/10 border-teal-500/20",
  "system-design": "text-cyan-300/90 bg-cyan-500/10 border-cyan-500/20",
  "domain-role": "text-emerald-300/90 bg-emerald-500/10 border-emerald-500/20",
  "take-home": "text-amber-300/90 bg-amber-500/10 border-amber-500/20",
  "hiring-manager": "text-blue-300/90 bg-blue-500/10 border-blue-500/20",
  "bar-raiser": "text-rose-300/90 bg-rose-500/10 border-rose-500/20",
  behavioral: "text-sky-300/90 bg-sky-500/10 border-sky-500/20",
  technical: "text-teal-300/90 bg-teal-500/10 border-teal-500/20",
  leadership: "text-amber-300/90 bg-amber-500/10 border-amber-500/20",
  coding: "text-emerald-300/90 bg-emerald-500/10 border-emerald-500/20",
};

function typeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return TYPE_LABELS[type] ?? type.replace(/[_-]+/g, " ");
}

function typeStyle(type: string | null | undefined): string {
  if (!type) return "text-[#B0B8C8] bg-white/[0.04] border-white/[0.08]";
  return TYPE_STYLES[type] ?? "text-[#B0B8C8] bg-white/[0.04] border-white/[0.08]";
}

function difficultyLabel(difficulty: string | null | undefined): string | null {
  if (!difficulty) return null;
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function scoreTone(score: number | null): string {
  if (score == null) return "text-[#A8B0C2]";
  if (score >= 80) return "text-emerald-400";
  if (score >= 70) return "text-amber-300";
  return "text-rose-300";
}

function ScorePath({ points }: { points: { label: string; value: number }[] }) {
  const gradientId = useId();
  const w = 100;
  const h = 44;
  const padX = 8;
  const padY = 8;

  const yForScore = (score: number) =>
    padY + (1 - Math.min(100, Math.max(0, score)) / 100) * (h - padY * 2);

  const coords =
    points.length === 1
      ? [
          { x: padX, y: yForScore(0), label: points[0]!.label, value: 0 },
          { x: 50, y: yForScore(points[0]!.value), label: points[0]!.label, value: points[0]!.value },
          { x: w - padX, y: yForScore(points[0]!.value), label: points[0]!.label, value: points[0]!.value },
        ]
      : points.map((p, i) => {
          const x = padX + (i / (points.length - 1)) * (w - padX * 2);
          const y = yForScore(p.value);
          return { x, y, label: p.label, value: p.value };
        });

  const plotCoords = points.length === 1 ? [coords[1]!] : coords;
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${coords[0]!.x},${h} ${line} ${coords[coords.length - 1]!.x},${h}`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] text-[#B8C0CE] lg:text-[13px]">Score path</p>
        <p className="font-mono text-[11px] text-[#B0B8C8] lg:text-xs">0 → 100</p>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-24 w-full overflow-visible lg:h-28"
        role="img"
        aria-label={`Score path across ${points.length} session${points.length === 1 ? "" : "s"}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={padX}
          x2={w - padX}
          y1={yForScore(0)}
          y2={yForScore(0)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="0.35"
        />
        <line
          x1={padX}
          x2={w - padX}
          y1={yForScore(50)}
          y2={yForScore(50)}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.35"
          strokeDasharray="1.5 1.5"
        />
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="#60A5FA"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {plotCoords.map((c, i) => (
          <g key={`${c.label}-${i}`}>
            <circle
              cx={c.x}
              cy={c.y}
              r={points.length === 1 ? "2.8" : "2"}
              fill="#0B0C10"
              stroke="#93C5FD"
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <div
        className={`mt-1 flex gap-1 ${points.length === 1 ? "justify-center" : "justify-between"}`}
      >
        {points.map((p, i) => (
          <span
            key={`${p.label}-${i}`}
            className={`min-w-0 truncate text-center font-mono text-xs tabular-nums lg:text-[13px] ${
              p.value >= 80
                ? "text-emerald-400"
                : p.value >= 70
                  ? "text-amber-300"
                  : "text-[#C5CBD8]"
            } ${points.length === 1 ? "max-w-none" : "flex-1"}`}
            title={`${p.label}: ${p.value}`}
          >
            {p.value}
            {points.length === 1 ? (
              <span className="ml-1.5 text-[11px] font-sans text-[#A8B0C2]">{p.label}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function statByKey(stats: StatItem[], key: StatItem["iconKey"]) {
  return stats.find((s) => s.iconKey === key);
}

export default function DashboardOverviewClient({
  userId,
  firstName,
  isFirstLogin,
  stats,
  recentSessions,
  topStrength,
  topFocus,
}: DashboardOverviewClientProps) {
  const hasRecommendations = Boolean(topStrength || topFocus);
  const router = useRouter();
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    interviewId: string;
    date: string;
  } | null>(null);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const hasSessions = recentSessions.length > 0;
  const latest = recentSessions[0];
  const average = statByKey(stats, "average");
  const completed = statByKey(stats, "completed");
  const hours = statByKey(stats, "hours");
  const streak = statByKey(stats, "streak");

  const scorePath = useMemo(
    () =>
      [...recentSessions]
        .reverse()
        .filter((s): s is SessionItem & { score: number } => s.score != null)
        .slice(-8)
        .map((s) => ({ label: s.date, value: s.score })),
    [recentSessions],
  );

  const signalValue =
    latest?.score != null
      ? String(latest.score)
      : average?.value && average.value !== "—"
        ? average.value
        : null;
  const signalLabel =
    latest?.score != null
      ? "Last run"
      : average?.value && average.value !== "—"
        ? "Average"
        : null;
  const signalDetail = latest ? `${latest.role} at ${displayCompany(latest.company)}` : null;

  const instruments = [
    { label: "Completed", value: completed?.value ?? "0", suffix: completed?.suffix },
    average?.value && average.value !== "—"
      ? { label: "Average", value: average.value, suffix: average.suffix }
      : null,
    { label: "Hours", value: hours?.value ?? "0", suffix: hours?.suffix },
    { label: "Streak", value: streak?.value ?? "0", suffix: streak?.suffix ?? "d" },
  ].filter((item): item is NonNullable<typeof item> => item != null);

  useEffect(() => {
    try {
      const dismissed =
        typeof window !== "undefined" &&
        !!localStorage.getItem(`snap-welcome-dismissed-${userId}`);
      if (!dismissed && isFirstLogin) {
        void Promise.resolve().then(() => setShowWelcome(true));
      }
    } catch {
      // ignore
    }
  }, [userId, isFirstLogin]);

  const dismissWelcome = useCallback(() => {
    try {
      localStorage.setItem(`snap-welcome-dismissed-${userId}`, "1");
    } catch {
      // ignore
    }
    setShowWelcome(false);
  }, [userId]);

  useEffect(() => {
    if (!showWelcome) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismissWelcome();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showWelcome, dismissWelcome]);

  async function openSession(session: SessionItem) {
    if (isOpening) return;
    setIsOpening(session.id);
    try {
      let url = "";
      if (session.videoKey) {
        const res = await fetch("/api/s3/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: session.videoKey }),
        });
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          url = data.url;
        }
      }
      setSelectedVideo({ url, interviewId: session.id, date: session.date });
    } finally {
      setIsOpening(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-11 pb-16 pt-2 xl:max-w-[88rem]">
      <SlideIn>
        <header className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <FlipDate size="lg" />
          <div className="min-w-0 sm:max-w-md sm:text-right">
            <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#F2F4F8] sm:text-[2.35rem]">
              {isFirstLogin ? (
                <>
                  Hey, <span className="italic text-[#A8B0C2]">{firstName}</span>
                </>
              ) : (
                <>
                  Welcome back, <span className="italic text-[#A8B0C2]">{firstName}</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#A8B0C2]">
              {hasSessions
                ? "Pick up where you left off, or start a fresh run."
                : "Mic, video, transcript, and a scored rubric in one practice."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:justify-end">
              <Link
                href="/practice"
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
              >
                <IconPractice className="h-4 w-4" />
                Start Mock Interview
              </Link>
              <Link
                href="/questions"
                className="inline-flex h-11 cursor-pointer items-center rounded-lg px-4 text-sm font-medium text-[#B8C0CE] transition-colors hover:text-[#E8ECF4]"
              >
                Browse questions
              </Link>
            </div>
          </div>
        </header>
      </SlideIn>

      {hasSessions ? (
        <FadeIn direction="up">
          <section className="py-1">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
              <div className="min-w-0">
                {signalValue && signalLabel ? (
                  <>
                    <p className="text-[13px] text-[#B8C0CE] lg:text-sm">{signalLabel}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-5xl font-medium tracking-tight text-[#F2F4F8] sm:text-6xl lg:text-7xl">
                        {signalValue}
                      </span>
                      <span className="font-mono text-lg font-medium text-[#B8C0CE] lg:text-xl">/100</span>
                    </div>
                    {signalDetail ? (
                      <p className="mt-2 truncate text-sm text-[#C5CBD8] lg:text-[15px]">{signalDetail}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-[#C5CBD8]">
                    {signalDetail
                      ? `${signalDetail} (score pending evaluation)`
                      : "Scores appear after evaluation"}
                  </p>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 lg:gap-x-12">
                {instruments.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[12px] text-[#B8C0CE] lg:text-[13px]">{item.label}</dt>
                    <dd className="mt-1 flex items-baseline gap-1 font-mono text-xl font-medium tracking-tight text-[#F2F4F8] lg:text-2xl">
                      <span>{item.value}</span>
                      {item.suffix ? (
                        <span className="text-base font-medium text-[#C5CBD8] lg:text-lg">
                          {item.suffix}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {scorePath.length > 0 ? (
              <div className="mt-7">
                <ScorePath points={scorePath} />
                <div className="mt-3.5 flex justify-end">
                  <Link
                    href="/analytics"
                    className="cursor-pointer text-sm text-[#A8B0C2] transition-colors hover:text-[#C5CBD8]"
                  >
                    Full analytics →
                  </Link>
                </div>
              </div>
            ) : null}
          </section>
        </FadeIn>
      ) : null}

      {hasRecommendations ? (
        <FadeIn delay={0.04} direction="up">
          <section>
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
                Recommendations
              </h2>
              <p className="text-xs text-[#B8C0CE]">From your evaluations</p>
            </div>
            <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {topFocus ? (
                <div>
                  <p className="text-[12px] text-[#A8B0C2]">Focus next</p>
                  <p className="mt-1 text-[15px] leading-snug text-[#E8ECF4]">{topFocus}</p>
                  <Link
                    href="/practice"
                    className="mt-2 inline-flex cursor-pointer text-sm text-[#60A5FA] transition-colors hover:text-[#93C5FD]"
                  >
                    Practice this →
                  </Link>
                </div>
              ) : null}
              {topStrength ? (
                <div>
                  <p className="text-[12px] text-[#A8B0C2]">Keep leaning on</p>
                  <p className="mt-1 text-[15px] leading-snug text-[#E8ECF4]">{topStrength}</p>
                </div>
              ) : null}
            </div>
          </section>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.05} direction="up">
        <section>
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
              Recent sessions
            </h2>
            {hasSessions ? (
              <Link
                href="/recordings"
                className="cursor-pointer text-sm text-[#A8B0C2] transition-colors hover:text-[#C5CBD8]"
              >
                View all
              </Link>
            ) : null}
          </div>

          {!hasSessions ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] px-6 py-11 text-center">
              <p className="font-display text-xl text-[#E8ECF4]">No sessions recorded yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#A8B0C2]">
                After your first mock interview, recordings and scores land here.
              </p>
              <Link
                href="/practice"
                className="mt-5 inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
              >
                Start an interview now
              </Link>
            </div>
          ) : (
            <FadeInStagger className="divide-y divide-white/[0.05]">
              {recentSessions.slice(0, 6).map((s) => {
                const kind = typeLabel(s.type);
                const level = difficultyLabel(s.difficulty);
                return (
                  <FadeInStaggerItem key={s.id}>
                    <button
                      type="button"
                      onClick={() => openSession(s)}
                      disabled={isOpening !== null}
                      className="group flex w-full cursor-pointer items-center gap-3.5 py-3 text-left transition-colors hover:bg-white/[0.02] disabled:pointer-events-none disabled:opacity-60 sm:gap-5"
                    >
                      <CompanyMark company={displayCompany(s.company)} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="truncate text-[15px] font-medium leading-tight text-[#E8ECF4] group-hover:text-white">
                            {s.role}
                          </p>
                          {kind ? (
                            <span
                              className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-medium leading-tight tracking-wide ${typeStyle(s.type)}`}
                            >
                              {kind}
                            </span>
                          ) : null}
                          {level ? (
                            <span className="shrink-0 text-[11px] leading-tight text-[#B8C0CE]">{level}</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[13px] leading-tight text-[#A8B0C2]">
                          <span className="text-[#C5CBD8]">{displayCompany(s.company)}</span>
                          {" · "}
                          {s.date} · {s.duration}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs leading-none text-[#B8C0CE]">
                          {s.score == null ? "Pending" : getScoreLabel(s.score)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-base tabular-nums leading-none ${scoreTone(s.score)}`}
                      >
                        {s.score == null ? "—" : s.score}
                      </span>
                      {isOpening === s.id ? (
                        <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-[#60A5FA]" />
                      ) : (
                        <span className="hidden w-4 text-[#B8C0CE] transition-colors group-hover:text-[#93C5FD] sm:inline">
                          →
                        </span>
                      )}
                    </button>
                  </FadeInStaggerItem>
                );
              })}
            </FadeInStagger>
          )}
        </section>
      </FadeIn>

      <RecordingModal
        isOpen={selectedVideo !== null}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.url ?? ""}
        interviewId={selectedVideo?.interviewId ?? null}
        videoDate={selectedVideo?.date ?? ""}
        onDeleted={() => {
          setSelectedVideo(null);
          router.refresh();
        }}
      />

      {showWelcome && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B0C10]/80 p-4 backdrop-blur-sm"
          onClick={dismissWelcome}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141C] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismissWelcome}
              className="absolute right-4 top-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#A8B0C2] transition-colors hover:bg-white/[0.06] hover:text-[#C5CBD8]"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="text-sm text-[#A8B0C2]">Getting started</p>
            <h2 className="mt-1 font-display text-2xl tracking-tight text-[#F2F4F8]">
              Welcome, {firstName}
            </h2>
            <p className="mt-2 text-sm text-[#B0B8C8]">
              A few quick steps before your first mock interview.
            </p>

            <div className="mt-6 space-y-2">
              <Link
                href="/settings"
                onClick={dismissWelcome}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#E8ECF4]">Upload your resume</p>
                  <p className="text-xs text-[#A8B0C2]">Match questions to your stack</p>
                </div>
                <span className="text-[#A8B0C2]">→</span>
              </Link>
              <Link
                href="/questions"
                onClick={dismissWelcome}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#E8ECF4]">Explore question bank</p>
                  <p className="text-xs text-[#A8B0C2]">Behavioral, system design, and more</p>
                </div>
                <span className="text-[#A8B0C2]">→</span>
              </Link>
              <Link
                href="/coding"
                onClick={dismissWelcome}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#E8ECF4]">Explore coding concepts</p>
                  <p className="text-xs text-[#A8B0C2]">Read-only JavaScript previews and public samples</p>
                </div>
                <span className="text-[#A8B0C2]">→</span>
              </Link>
              <Link
                href="/practice"
                onClick={dismissWelcome}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-[#3B82F6]/15 px-3 py-3 transition-colors hover:bg-[#3B82F6]/20"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Start your first interview</p>
                  <p className="text-xs text-[#93C5FD]/80">Live video, voice, instant score</p>
                </div>
                <span className="text-[#93C5FD]">→</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={dismissWelcome}
              className="mt-5 w-full cursor-pointer text-center text-xs text-[#B8C0CE] transition-colors hover:text-[#C5CBD8]"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
