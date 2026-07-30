import { Mic, Video, BarChart3, Zap } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="landing-section">
      <div className="landing-container">

        {/* Section header — left-aligned, editorial */}
        <div className="flex items-baseline gap-5 border-b border-white/[0.07] pb-6">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#3D4F73]">
            01 / Features
          </span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-[#F5F7FF]">
            What makes it different
          </h2>
        </div>

        {/* Asymmetric bento grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">

          {/* LARGE CARD — spans 7 cols */}
          <article className="group lg:col-span-7 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 transition-colors duration-300 hover:border-white/[0.13]">
            {/* Decorative large number */}
            <span className="pointer-events-none absolute -right-3 -top-5 select-none text-[8rem] font-black leading-none text-white/[0.025]" aria-hidden="true">
              01
            </span>
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                  <Mic className="h-4.5 w-4.5 text-violet-400" />
                </div>
                <span className="text-xs font-medium text-[#4A5568]">Voice-first</span>
              </div>
              <h3 className="text-[1.25rem] font-bold leading-snug tracking-tight text-[#F5F7FF]">
                It listens. Then it pushes back.
              </h3>
              <p className="mt-3 max-w-md text-[0.92rem] leading-relaxed text-[#6B7A96]">
                Answer out loud with your mic open. SnapInterview follows your reasoning and asks the
                follow-ups a real interviewer would ask — not a pre-written script. No two sessions
                are identical.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["28+ roles", "Adaptive Q&A", "Real-time audio"].map((t) => (
                  <span key={t} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[0.7rem] font-medium text-[#4A5568]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </article>

          {/* TALL CARD — spans 5 cols */}
          <article className="group lg:col-span-5 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 transition-colors duration-300 hover:border-white/[0.13]">
            <span className="pointer-events-none absolute -right-3 -top-5 select-none text-[8rem] font-black leading-none text-white/[0.025]" aria-hidden="true">
              02
            </span>
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
                  <Video className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <span className="text-xs font-medium text-[#4A5568]">Video replay</span>
              </div>
              <h3 className="text-[1.25rem] font-bold leading-snug tracking-tight text-[#F5F7FF]">
                Watch yourself. Cringe. Improve.
              </h3>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-[#6B7A96]">
                Your recording plays back alongside the full transcript. See exactly where you
                stumbled, rambled, or nailed it — before it counts.
              </p>
            </div>
          </article>

          {/* WIDE SHORT CARD — spans 5 cols */}
          <article className="group lg:col-span-5 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 transition-colors duration-300 hover:border-white/[0.13]">
            <span className="pointer-events-none absolute -right-3 -top-5 select-none text-[8rem] font-black leading-none text-white/[0.025]" aria-hidden="true">
              03
            </span>
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                  <BarChart3 className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-[#4A5568]">Scoring</span>
              </div>
              <h3 className="text-[1.25rem] font-bold leading-snug tracking-tight text-[#F5F7FF]">
                Numbers you can act on.
              </h3>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-[#6B7A96]">
                Objective scores across technical depth, clarity, and communication. Tied to
                rubrics real interviewers actually use.
              </p>
            </div>
          </article>

          {/* NARROW TALL CARD — spans 4 cols — accent color */}
          <article className="group lg:col-span-4 relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-7 transition-colors duration-300 hover:border-indigo-500/30">
            <span className="pointer-events-none absolute -right-3 -top-5 select-none text-[8rem] font-black leading-none text-indigo-400/[0.06]" aria-hidden="true">
              04
            </span>
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/25">
                  <Zap className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <span className="text-xs font-medium text-indigo-500/70">Practice mode</span>
              </div>
              <h3 className="text-[1.25rem] font-bold leading-snug tracking-tight text-[#F5F7FF]">
                Drill the weak spots.
              </h3>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-[#6B7A96]">
                Skip the full mock. Target individual questions by type and difficulty until
                they stop feeling hard.
              </p>
            </div>
          </article>

          {/* STAT CARD — spans 3 cols */}
          <article className="group lg:col-span-3 relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 transition-colors duration-300 hover:border-white/[0.13]">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#3D4F73]">
                Roles covered
              </p>
              <p className="mt-2 text-[3.5rem] font-black leading-none tracking-tight text-[#F5F7FF]">
                28<span className="text-violet-400">+</span>
              </p>
            </div>
            <p className="mt-4 text-[0.82rem] leading-relaxed text-[#4A5568]">
              From SWE to PM to data science — questions tuned to your role and level.
            </p>
          </article>

        </div>
      </div>
    </section>
  );
}
