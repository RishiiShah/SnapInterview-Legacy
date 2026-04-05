import Link from "next/link";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import { IconChevronRight } from "@/components/ui/icons";

const heroSignals = [
  "Role-targeted mock sessions",
  "Actionable transcript scoring",
  "Replayable interview recordings",
];

const scorePills = [
  ["Pacing", "Steady"],
  ["Clarity", "Strong"],
  ["Depth", "Needs detail"],
];

const feedbackRows = [
  ["Follow-up accuracy", "Tight"],
  ["Answer structure", "Sharpen the opening"],
  ["Signal for hiring panel", "Promising"],
];

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-18 text-center md:px-12">
      <div className="pointer-events-none absolute inset-x-0 top-20 mx-auto h-72 max-w-5xl rounded-full bg-[radial-gradient(circle,#31b6ff20_0,#31b6ff0d_34%,transparent_72%)] blur-3xl" />

      <SlideIn delay={0.04}>
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-sky-200/90 bg-white/86 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-[0_12px_34px_-24px_rgba(20,157,255,0.75)] backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
          Built For Interview Reps That Actually Feel Real
        </span>
      </SlideIn>

      <SlideIn delay={0.1}>
        <h1 className="mx-auto max-w-5xl text-[clamp(2.7rem,6vw,5rem)] font-bold leading-[1.02] tracking-tight text-zinc-950">
          Practice the exact
          <br className="hidden sm:block" />
          interview you want to win.
        </h1>
      </SlideIn>

      <SlideIn delay={0.16}>
        <p className="mx-auto mt-6 max-w-3xl text-[clamp(1.07rem,2vw,1.32rem)] leading-relaxed text-zinc-600">
          SnapInterview lets you rehearse role-specific mock interviews, hear sharper
          follow-up questions, review your recordings, and fix weak answers before the real call.
        </p>
      </SlideIn>

      <SlideIn delay={0.22}>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500">
          {heroSignals.map((item) => (
            <span
              key={item}
              className="rounded-full border border-sky-100 bg-white/78 px-3.5 py-1.5 shadow-[0_12px_24px_-24px_rgba(15,109,252,0.9)] backdrop-blur-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </SlideIn>

      <SlideIn delay={0.28}>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="group relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,#18a7ff,#0f6dfc)] px-7 py-3 text-sm font-semibold text-white shadow-[0_22px_44px_-24px_rgba(15,109,252,0.9)] transition-all hover:-translate-y-0.5 hover:brightness-105"
          >
            <span className="relative z-10">Start Practicing</span>
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </Link>
          <a
            href="#how-it-works"
            className="group flex items-center gap-2 rounded-xl border border-sky-100 bg-white/70 px-7 py-3 text-sm font-semibold text-zinc-700 shadow-[0_18px_32px_-28px_rgba(15,109,252,0.8)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white"
          >
            See How It Works
            <IconChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-zinc-900"
              strokeWidth={2.5}
            />
          </a>
        </div>
      </SlideIn>

      <FadeIn delay={0.34} direction="up" className="relative z-10 w-full">
        <div className="mx-auto mt-16 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-sky-100/80 bg-white/88 shadow-[0_45px_90px_-56px_rgba(15,109,252,0.5)] ring-1 ring-sky-100/70 transition-transform duration-500 hover:scale-[1.008]">
          <div className="flex items-center gap-2 border-b border-sky-100 bg-white/84 px-4 py-3 backdrop-blur-sm">
            <span className="h-3 w-3 rounded-full bg-sky-100" />
            <span className="h-3 w-3 rounded-full bg-sky-200" />
            <span className="h-3 w-3 rounded-full bg-sky-300" />
            <span className="mx-auto block w-60 rounded-md border border-sky-100 bg-sky-50/70 px-3 py-1 text-center font-mono text-[11px] tracking-tight text-sky-700">
              snapinterview.app/practice
            </span>
          </div>

          <div className="grid gap-6 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] p-8 sm:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[1.35rem] border border-sky-100 bg-white p-6 shadow-[0_24px_40px_-36px_rgba(15,109,252,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                    Live Mock
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-zinc-950">
                    Frontend Engineer at Stripe
                  </h3>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  In Session
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-sky-50 bg-sky-50/70 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Current Prompt
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Walk me through a React performance issue you caught in production and how you proved the fix worked.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {scorePills.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-left">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.35rem] border border-sky-100 bg-white p-5 shadow-[0_22px_34px_-34px_rgba(15,109,252,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                  Feedback Snapshot
                </p>
                <div className="mt-4 space-y-3">
                  {feedbackRows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2.5">
                      <span className="text-sm text-zinc-600">{label}</span>
                      <span className="text-sm font-semibold text-zinc-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-zinc-100 bg-[linear-gradient(135deg,#041321,#0f6dfc)] p-5 text-left text-white shadow-[0_26px_44px_-34px_rgba(15,109,252,0.75)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/90">
                  Next Rep
                </p>
                <p className="mt-3 text-lg font-semibold leading-7">
                  Re-run this interview with a stricter interviewer and deeper system-design follow-ups.
                </p>
                <div className="mt-5 h-10 rounded-xl bg-white/14" />
                <div className="mt-3 h-2 w-4/5 rounded-full bg-white/18" />
                <div className="mt-2 h-2 w-3/5 rounded-full bg-white/12" />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
