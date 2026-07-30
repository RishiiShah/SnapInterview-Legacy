import { BarChart3, Code, Cpu, Mic, ShieldCheck, Sparkles, Video, Zap } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="landing-section py-20 bg-[#090A0F]">
      <div className="landing-container">

        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            Core Capabilities
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Everything you need for serious interview prep
          </h2>
          <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-[#94A3B8]">
            Built around realistic, high-stakes practice: speaking out loud, handling unexpected probe questions, and reviewing objective score rubrics.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">

          {/* BENTO CARD 1 — Adaptive Voice AI (7 cols) */}
          <article className="group relative lg:col-span-7 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-7 backdrop-blur-md transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl transition-opacity group-hover:opacity-100" />
            
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                <Mic className="h-3.5 w-3.5" />
                Adaptive Voice Interviewer
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                It listens. Then it pushes back.
              </h3>
              <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-[#94A3B8]">
                Answer out loud with your mic open. SnapInterview listens to your reasoning and asks adaptive follow-ups based on what you said — just like a senior interviewer.
              </p>
            </div>

            {/* Micro Graphic: Simulated Voice & Waveform UI */}
            <div className="mt-6 rounded-xl border border-white/10 bg-[#06070B] p-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2.5">
                <span className="flex items-center gap-2 font-mono text-violet-300">
                  <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                  AI Interviewer Active
                </span>
                <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[0.65rem] font-medium text-violet-300">
                  Adaptive Probing
                </span>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-3 text-xs leading-relaxed text-[#E2E8F0] border border-white/5">
                <span className="font-semibold text-violet-400">Interviewer: </span>
                "You mentioned an $O(N)$ lookup. How would your space complexity scale if memory was severely constrained?"
              </div>
            </div>
          </article>

          {/* BENTO CARD 2 — Video Replay & Transcript (5 cols) */}
          <article className="group relative lg:col-span-5 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-7 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl transition-opacity group-hover:opacity-100" />
            
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                <Video className="h-3.5 w-3.5" />
                Video Replay & Transcript
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Watch yourself. Spot weak spots. Improve.
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                Review your session video alongside a synchronized word-for-word transcript. See exactly where you hesitated or rambled.
              </p>
            </div>

            {/* Micro Graphic: Simulated Video Player */}
            <div className="mt-6 rounded-xl border border-white/10 bg-[#06070B] p-3">
              <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-2">
                <span className="font-mono text-cyan-300 text-[0.7rem]">HD Video Recording</span>
                <span className="text-[0.65rem] text-emerald-400">Audio Sync Ready</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
              </div>
            </div>
          </article>

          {/* BENTO CARD 3 — Objective Scoring Rubrics (5 cols) */}
          <article className="group relative lg:col-span-5 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-7 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_40px_rgba(52,211,153,0.15)]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <BarChart3 className="h-3.5 w-3.5" />
                Objective Rubric Scoring
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Scores tied to real hiring bars.
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                Get actionable scores across technical depth, problem-solving, and communication clarity after every practice run.
              </p>
            </div>

            {/* Micro Graphic: Score pills */}
            <div className="mt-6 space-y-2">
              {[
                { label: "Technical Depth", score: "88%", color: "bg-emerald-400" },
                { label: "Communication Clarity", score: "92%", color: "bg-cyan-400" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/[0.03] p-2.5 border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[#CBD5E1]">{item.label}</span>
                  <span className="font-mono font-bold text-white">{item.score}</span>
                </div>
              ))}
            </div>
          </article>

          {/* BENTO CARD 4 — Focused Question Drills (4 cols) */}
          <article className="group relative lg:col-span-4 flex flex-col justify-between overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-transparent p-7 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Zap className="h-3.5 w-3.5" />
                Question Drills
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Target your weak spots.
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                Skip full mocks when short on time. Drill specific question types by role and difficulty until you feel confident.
              </p>
            </div>

            {/* Tag pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {["System Design", "Behavioral", "Coding", "SQL"].map((tag) => (
                <span key={tag} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#CBD5E1]">
                  {tag}
                </span>
              ))}
            </div>
          </article>

          {/* BENTO CARD 5 — 28+ Roles Supported (3 cols) */}
          <article className="group relative lg:col-span-3 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-7 backdrop-blur-md transition-all duration-300 hover:border-amber-500/40">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Supported Roles
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">28</span>
                <span className="text-2xl font-bold text-amber-400">+</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#94A3B8]">
              Software Engineers, PMs, Data Scientists, DevOps, and Engineering Managers.
            </p>
          </article>

        </div>
      </div>
    </section>
  );
}
