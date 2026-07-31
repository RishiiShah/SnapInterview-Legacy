import Link from "next/link";
import { ArrowRight, Clock, FileText, Gauge, ScrollText } from "lucide-react";

function SessionPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[38rem] lg:ml-auto lg:mr-0"
    >
      <div className="origin-bottom-left rotate-[-4deg] rounded-2xl border border-zinc-400/40 bg-[#C9CDD4] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.4)] lg:translate-x-4 lg:translate-y-1 xl:translate-x-8">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-500/25 pb-3">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              Session review
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800">
              Mid-level software engineer
            </p>
            <p className="mt-1 text-[0.65rem] text-zinc-600">
              Behavioral complete · Coding in progress
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-200/70 px-2.5 py-1 text-[0.6rem] font-semibold text-emerald-900">
            Strong pass
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-500/20 bg-[#D4D8DE] px-3 py-2.5">
            <FileText className="h-4 w-4 shrink-0 text-sky-700" />
            <div className="min-w-0">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Resume
              </p>
              <p className="truncate text-[0.72rem] font-medium text-zinc-800">
                resume.pdf
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-500/20 bg-[#D4D8DE] px-3 py-2.5">
            <ScrollText className="h-4 w-4 shrink-0 text-violet-700" />
            <div className="min-w-0">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Job description
              </p>
              <p className="truncate text-[0.72rem] font-medium text-zinc-800">
                google_swe.txt
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-500/20 bg-[#D4D8DE] px-3 py-2.5">
            <Gauge className="h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Difficulty
              </p>
              <p className="text-[0.72rem] font-medium text-zinc-800">Medium</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-500/20 bg-[#D4D8DE] px-3 py-2.5">
            <Clock className="h-4 w-4 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Length
              </p>
              <p className="text-[0.72rem] font-medium text-zinc-800">18 minutes</p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {[
            ["Communication", "8.4"],
            ["Problem solving", "7.9"],
            ["Presence", "8.1"],
          ].map(([label, score]) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-500/20 bg-[#D4D8DE] px-2 py-3 text-center"
            >
              <p className="text-xl font-semibold tabular-nums leading-none text-zinc-800">{score}</p>
              <p className="mt-1.5 text-[0.62rem] leading-tight text-zinc-600">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3.5 space-y-2 rounded-xl border border-zinc-500/20 bg-[#D4D8DE] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Transcript
            </p>
            <p className="text-[0.58rem] text-zinc-500">Coding extension</p>
          </div>
          <p className="text-[0.7rem] leading-snug text-violet-800">
            AI: Walk me through your approach before writing code.
          </p>
          <p className="text-[0.7rem] leading-snug text-zinc-700">
            You: I&apos;d use a hash map for O(1) lookups, then verify edge cases.
          </p>
          <p className="text-[0.7rem] leading-snug text-violet-800">
            AI: What happens if the input contains duplicates?
          </p>
          <p className="text-[0.7rem] leading-snug text-zinc-700">
            You: Store first seen index only, so duplicates still resolve in one pass.
          </p>
        </div>

        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[0.58rem] font-medium text-zinc-500">
              Timeline · coding after behavioral
            </p>
            <p className="text-[0.6rem] tabular-nums text-zinc-600">10:24 / 18:00</p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-500/25">
            <div className="h-full w-[57%] rounded-full bg-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CTASection() {
  return (
    <section id="get-started" className="landing-section relative z-10 bg-[#090A0F] py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 border-t border-white/[0.08] pt-5 space-y-2.5 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            Get Started
          </span>
          <h2 className="font-serif text-3xl leading-tight tracking-[-0.03em] text-[#E2E8F0] sm:text-4xl lg:text-5xl">
            Your next interview won&apos;t be your first.
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#64748B]">
            Create a free account, practice live on mic and video, then review your recording before the real conversation.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[#111318] sm:rounded-[2.5rem]">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          <svg
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full"
            viewBox="0 0 1200 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="cta-arc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
                <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#818CF8" stopOpacity="0.55" />
                <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
              <filter id="cta-arc-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            <path
              d="M40 150 C 220 40, 420 20, 600 55 C 780 90, 980 35, 1160 150"
              fill="none"
              stroke="url(#cta-arc)"
              strokeWidth="3"
              filter="url(#cta-arc-blur)"
            />
            <path
              d="M40 150 C 220 40, 420 20, 600 55 C 780 90, 980 35, 1160 150"
              fill="none"
              stroke="url(#cta-arc)"
              strokeWidth="1.25"
              opacity="0.9"
            />
          </svg>

          <div className="relative grid items-center gap-8 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1fr_1.15fr] lg:gap-4 lg:px-12 lg:py-14 xl:px-14">
            <div className="max-w-xl">
              <div className="mb-6 h-1 w-10 rounded-full bg-blue-500" aria-hidden="true" />
              <h3 className="font-serif text-[2rem] leading-[1.12] tracking-[-0.03em] text-[#E2E8F0] sm:text-4xl lg:text-[2.5rem]">
                Ready to simplify interview prep?
              </h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[#94A3B8] sm:text-[0.95rem]">
                Practice out loud with an adaptive interviewer, record the session, then review transcript and rubric scores before the real conversation.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 bg-transparent px-6 text-sm font-semibold text-[#E2E8F0] transition-colors hover:bg-white/[0.06] cursor-pointer"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="relative flex min-h-[18rem] items-center justify-end sm:min-h-[20rem] lg:min-h-[22rem]">
              <div className="pointer-events-none absolute right-0 top-4 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />
              <SessionPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
