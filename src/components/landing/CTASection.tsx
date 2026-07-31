import Link from "next/link";
import { ArrowRight, Clock, FileText, Gauge, Layers, ScrollText } from "lucide-react";
import {
  LandingFadeIn,
  LandingFadeOnly,
  LandingScaleIn,
} from "./LandingMotion";

function SessionPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[38rem] lg:ml-auto lg:mr-0"
    >
      <div className="origin-bottom-left rotate-[-3deg] rounded-2xl border border-zinc-400/40 bg-[#C9CDD4] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-500/25 pb-2.5">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              Session review
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800">
              Mid-level software engineer
            </p>
            <p className="mt-0.5 text-[0.65rem] text-zinc-600">
              Coding in progress
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-sky-200/80 px-2.5 py-1 text-[0.6rem] font-semibold text-sky-900">
              Pass
            </span>
            <p className="text-[0.6rem] tabular-nums text-zinc-600">
              Overall <span className="font-semibold text-zinc-800">8.1</span>
            </p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-5 gap-1.5">
          <div className="min-w-0 rounded-lg border border-zinc-500/20 bg-[#D4D8DE] px-2 py-1.5">
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3 shrink-0 text-blue-700" />
              <p className="text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Type
              </p>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] font-medium text-zinc-800">
              Coding
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-zinc-500/20 bg-[#D4D8DE] px-2 py-1.5">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 shrink-0 text-sky-700" />
              <p className="text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Resume
              </p>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] font-medium text-zinc-800">
              resume.pdf
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-zinc-500/20 bg-[#D4D8DE] px-2 py-1.5">
            <div className="flex items-center gap-1">
              <ScrollText className="h-3 w-3 shrink-0 text-violet-700" />
              <p className="text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                JD
              </p>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] font-medium text-zinc-800">
              google_swe.txt
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-zinc-500/20 bg-[#D4D8DE] px-2 py-1.5">
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 shrink-0 text-amber-700" />
              <p className="text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Diff
              </p>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] font-medium text-zinc-800">Medium</p>
          </div>
          <div className="min-w-0 rounded-lg border border-zinc-500/20 bg-[#D4D8DE] px-2 py-1.5">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0 text-emerald-700" />
              <p className="text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Length
              </p>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] font-medium text-zinc-800">18 min</p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {[
            ["Communication", "8.4", "Clear structure"],
            ["Problem solving", "7.9", "Solid tradeoffs"],
            ["Presence", "8.1", "Steady pace"],
          ].map(([label, score, note]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-500/20 bg-[#D4D8DE] px-2 py-2 text-center"
            >
              <p className="text-lg font-semibold tabular-nums leading-none text-zinc-800">{score}</p>
              <p className="mt-1 text-[0.6rem] font-medium leading-tight text-zinc-700">{label}</p>
              <p className="mt-0.5 text-[0.55rem] leading-tight text-zinc-500">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 space-y-1.5 rounded-lg border border-zinc-500/20 bg-[#D4D8DE] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Transcript
            </p>
            <p className="text-[0.55rem] text-zinc-500">Coding · 10:24</p>
          </div>
          <p className="text-[0.65rem] leading-snug text-violet-800">
            AI: Walk me through your approach before you write any code, including data structures and edge cases.
          </p>
          <p className="text-[0.65rem] leading-snug text-zinc-700">
            You: I&apos;d start with a hash map keyed by value to index for O(1) lookups, scan once for the complement, then verify empty arrays, single elements, and negatives before coding..
          </p>
          <p className="text-[0.65rem] leading-snug text-violet-800">
            AI: What happens if the input contains duplicates, and how does that change your map strategy?
          </p>
          <p className="text-[0.65rem] leading-snug text-zinc-700">
            You: I&apos;d store only the first-seen index for each value so later duplicates still resolve to a valid pair without rewriting the loop or adding a second pass..
          </p>
          <p className="text-[0.65rem] leading-snug text-violet-800">
            AI: Could you sketch the time and space complexity before we move into the implementation?
          </p>
          <p className="text-[0.65rem] leading-snug text-zinc-700">
            You: Time stays O(n) for one linear scan with constant-time map ops, and space is O(n) in the worst case when every value is unique and lands in the map..
          </p>
        </div>

        <div className="mt-2.5 flex items-center gap-3">
          <p className="shrink-0 text-[0.55rem] text-zinc-500">
            Mid-session · coding live
          </p>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-500/25">
            <div className="h-full w-[57%] rounded-full bg-blue-600" />
          </div>
          <p className="shrink-0 text-[0.6rem] tabular-nums text-zinc-600">10:24 / 18:00</p>
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
          <LandingFadeOnly triggerOnView>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              Get Started
            </span>
          </LandingFadeOnly>
          <LandingFadeOnly triggerOnView delay={0.07}>
            <h2 className="font-serif text-3xl leading-tight tracking-[-0.03em] text-[#E2E8F0] sm:text-4xl lg:text-5xl">
              Practice before the interview that counts.
            </h2>
          </LandingFadeOnly>
          <LandingFadeOnly triggerOnView delay={0.16} className="mx-auto max-w-5xl">
            <p className="text-sm leading-relaxed text-[#64748B] lg:whitespace-nowrap">
              Create a free account, practice out loud on mic and video, then scrub the recording and transcript before the real interview.
            </p>
          </LandingFadeOnly>
        </div>

        <LandingScaleIn triggerOnView scaleFrom={0.98} duration={1.01} delay={0.11}>
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

          <div className="relative grid items-start gap-8 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1fr_1.15fr] lg:gap-6 lg:px-12 lg:py-14 lg:pr-14 xl:px-14 xl:pr-16">
            <LandingFadeOnly triggerOnView delay={0.16} className="max-w-xl">
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
            </LandingFadeOnly>

            <LandingFadeIn
              triggerOnView
              direction="left"
              delay={0.27}
              duration={1.15}
              className="relative flex items-start justify-end overflow-visible pt-2 pb-6 pr-1 sm:pr-2"
            >
              <div className="pointer-events-none absolute right-0 top-4 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />
              <SessionPreview />
            </LandingFadeIn>
          </div>
        </div>
        </LandingScaleIn>
      </div>
    </section>
  );
}
