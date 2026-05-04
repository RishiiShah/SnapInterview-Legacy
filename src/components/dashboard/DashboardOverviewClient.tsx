"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getScoreColor, getScoreLabel } from "@/utils/helpers";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import { motion } from "framer-motion";
import RecordingModal from "@/components/recordings/RecordingModal";
import {
  IconCheckCircle,
  IconClock,
  IconFlame,
  IconPractice,
  IconQuestionBank,
  IconStarBurst,
} from "@/components/ui/icons";

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
  score: number;
  duration: string;
  date: string;
  videoKey: string | null;
};

type ChartItem = {
  label: string;
  value: number;
};

type DashboardOverviewClientProps = {
  userId: string;
  firstName: string;
  isFirstLogin: boolean;
  stats: StatItem[];
  recentSessions: SessionItem[];
  chartData: ChartItem[];
};

function renderStatIcon(iconKey: StatItem["iconKey"]) {
  if (iconKey === "completed") {
    return <IconCheckCircle className="h-5 w-5" />;
  }

  if (iconKey === "average") {
    return <IconStarBurst className="h-5 w-5" />;
  }

  if (iconKey === "hours") {
    return <IconClock className="h-5 w-5" />;
  }

  return <IconFlame className="h-5 w-5" />;
}

export default function DashboardOverviewClient({
  userId,
  firstName,
  isFirstLogin,
  stats,
  recentSessions,
  chartData,
}: DashboardOverviewClientProps) {
  const router = useRouter();
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; interviewId: string; date: string } | null>(null);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem(`snap-welcome-dismissed-${userId}`)
  );

  function dismissWelcome() {
    localStorage.setItem(`snap-welcome-dismissed-${userId}`, "1");
    setShowWelcome(false);
  }

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
    <div className="space-y-4 pb-8">
      <SlideIn>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {isFirstLogin ? `Welcome, ${firstName}` : `Welcome back, ${firstName}`}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Here&apos;s how your interview prep is going.</p>
        </div>
      </SlideIn>

      <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <FadeInStaggerItem key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500">{s.label}</span>
              <span className="text-zinc-400">{renderStatIcon(s.iconKey)}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-zinc-900">
              {s.value}
              {s.suffix && <span className="text-lg font-medium text-zinc-400">{s.suffix}</span>}
            </p>
            <p className="mt-1 text-xs text-emerald-600">{s.change}</p>
          </FadeInStaggerItem>
        ))}
      </FadeInStagger>

      <SlideIn delay={0.2}>
        <div className="flex flex-wrap gap-3 py-1">
          <Link href="/practice" className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-zinc-700 hover:shadow-lg hover:-translate-y-0.5">
            <IconPractice className="h-4 w-4" />
            Start New Interview
          </Link>
          <Link href="/questions" className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:-translate-y-0.5">
            <IconQuestionBank className="h-4 w-4" />
            Browse Questions
          </Link>
        </div>
      </SlideIn>

      <FadeIn delay={0.4} direction="up">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2 flex flex-col">
            <h3 className="mb-1 text-sm font-semibold text-zinc-900">Performance</h3>
            <p className="mb-2 text-xs text-zinc-400">Last 7 sessions</p>
            <div className="flex items-end gap-3 flex-1 min-h-55 pt-4 mt-2">
              {chartData.map((d, i) => (
                <div key={d.label} className="group flex flex-1 flex-col justify-end items-center gap-2 h-full">
                  <div className="relative flex-1 w-full flex items-end">
                    <motion.div
                      className="w-full relative rounded-md bg-zinc-200 transition-colors group-hover:bg-zinc-900 origin-bottom"
                      initial={{ height: "0%" }}
                      animate={{ height: `${Math.min(100, Math.max(4, d.value * 1.15))}%` }}
                      transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-medium text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                        {d.value}
                      </span>
                    </motion.div>
                  </div>
                  <span className="text-[10px] text-zinc-400">{d.label.split(" ")[1]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white lg:col-span-3">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-zinc-900">Recent Sessions</h3>
              <Link href="/recordings" className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900">View all →</Link>
            </div>
            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <p className="text-sm font-semibold text-zinc-800">No interviews yet</p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500">Complete your first mock interview to see your sessions here.</p>
                <Link href="/practice" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-700">
                  Start an Interview
                </Link>
              </div>
            ) : (
            <div className="divide-y divide-zinc-100">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSession(s)}
                  disabled={isOpening !== null}
                  className="group flex w-full items-center justify-between px-6 py-3.5 text-left transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500 transition-colors group-hover:bg-white group-hover:shadow-sm">{s.company.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{s.role}</p>
                      <p className="text-xs text-zinc-400">{s.company} · {s.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{s.score}<span className="text-xs font-normal text-zinc-400">/100</span></p>
                      <p className="text-[11px] text-zinc-400">{s.duration}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getScoreColor(s.score)}`}>{getScoreLabel(s.score)}</span>
                    {isOpening === s.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
                    ) : !s.videoKey && (
                      <svg className="h-3.5 w-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-label="No recording">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
            )}
          </div>
        </div>
      </FadeIn>

      <RecordingModal
        isOpen={selectedVideo !== null}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.url ?? ""}
        interviewId={selectedVideo?.interviewId ?? null}
        videoDate={selectedVideo?.date ?? ""}
        onDeleted={() => { setSelectedVideo(null); router.refresh(); }}
      />

      {/* Welcome / onboarding modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50" onClick={dismissWelcome}>
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismissWelcome}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">Getting started</p>
              <h2 className="text-2xl font-bold text-zinc-900">Welcome, {firstName}!</h2>
              <p className="mt-1.5 text-sm text-zinc-500">Here are a few things to set up before your first interview.</p>
            </div>

            <div className="space-y-3">
              <Link
                href="/settings"
                onClick={dismissWelcome}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40 group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-200 group-hover:ring-blue-200 transition-colors">
                  <svg className="h-4 w-4 text-zinc-500 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">Complete your profile</p>
                  <p className="text-xs text-zinc-500">Upload your resume so AI questions are tailored to your background.</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/questions"
                onClick={dismissWelcome}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40 group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-200 group-hover:ring-blue-200 transition-colors">
                  <svg className="h-4 w-4 text-zinc-500 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">Browse practice questions</p>
                  <p className="text-xs text-zinc-500">Explore behavioral, technical, and system design questions before your interview.</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/practice"
                onClick={dismissWelcome}
                className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100 group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900">Start your first interview</p>
                  <p className="text-xs text-blue-600/80">Practice with an AI interviewer and get scored feedback instantly.</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-blue-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <button
              onClick={dismissWelcome}
              className="mt-5 w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
