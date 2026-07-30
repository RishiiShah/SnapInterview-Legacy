"use client";

import { motion, type Variants, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, Code2, MessageCircle, Mic, Play, Sparkles, Terminal, Volume2 } from "lucide-react";

const CODE_LINES = [
  { text: "function firstUniqueChar(value) {", color: "text-[#C4B5FD]" },
  { text: "  const counts = new Map();", color: "text-[#BAE6FD]" },
  { text: "  for (const char of value) {", color: "text-[#C4B5FD]" },
  { text: "    counts.set(char, (counts.get(char) ?? 0) + 1);", color: "text-[#E2E8F0]" },
  { text: "  }", color: "text-[#C4B5FD]" },
  { text: "  return [...value].find((char) => counts.get(char) === 1) ?? null;", color: "text-[#67E8F9]" },
  { text: "}", color: "text-[#C4B5FD]" },
];

const REVIEW_METRICS = [
  { label: "Technical depth", value: 82, color: "bg-[#38BDF8]" },
  { label: "Clarity & structure", value: 90, color: "bg-[#A78BFA]" },
  { label: "Communication", value: 86, color: "bg-[#818CF8]" },
];

const sequence: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function HeroWorkspace() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div
      data-landing-hero-workspace
      aria-label="Illustrative coding interview workspace"
      className="relative mx-auto w-full landing-container"
    >
      {/* Header section above workspace */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#60A5FA]">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          Interactive Workspace Demo
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Step inside the room before the interview begins
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#94A3B8]">
          A live coding environment, speech-to-text transcript, and automated feedback system operating in real time.
        </p>
      </div>

      {/* Workspace Enclosure — Midnight Glass frame */}
      <div className="landing-workspace-frame relative overflow-hidden rounded-2xl border border-white/15 bg-[#0B0D18]/80 shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* Glow accent along top border */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        <div className="landing-workspace-shell">
          <div className="landing-workspace">
            
            {/* Pane 1: Live Voice & Speech-to-Text */}
            <section aria-label="Interview conversation" className="landing-workspace-pane flex flex-col p-4.5">
              <div className="flex items-center justify-between pb-3 text-xs text-[#8E97AB] border-b border-white/10">
                <span className="flex items-center gap-2 font-semibold text-[#F5F7FF]">
                  <MessageCircle className="h-4 w-4 text-[#A78BFA]" />
                  Live Interview Session
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.65rem] font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live AI Voice
                </span>
              </div>

              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#A78BFA]">
                    Interviewer (AI)
                  </p>
                  <Volume2 className="h-3.5 w-3.5 text-[#A78BFA]/70" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#E2E8F0]">
                  Implement a function that returns the first non-repeating character in a string.
                </p>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                transition={reducedMotion ? undefined : { delay: 0.35 }}
                className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#67E8F9]">
                    You (Candidate)
                  </p>
                  <Mic className="h-3.5 w-3.5 text-[#67E8F9]/70" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">
                  I’ll count occurrences first, then scan the string again so the result stays linear and easy to explain.
                </p>
              </motion.div>

              {/* Simulated Audio Waveform Bar */}
              <div className="mt-4.5 rounded-xl bg-white/[0.03] p-2.5 border border-white/5 flex items-center gap-2.5">
                <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  <Play className="h-3 w-3 fill-current ml-0.5" />
                </button>
                <div className="flex flex-1 items-center gap-0.5 h-4">
                  {[40, 75, 30, 90, 60, 100, 45, 80, 50, 70, 35, 85, 60, 40, 95, 50, 30, 70, 40].map((h, idx) => (
                    <span
                      key={idx}
                      className="flex-1 rounded-full bg-blue-400/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <span className="text-[0.65rem] font-mono text-[#64748B]">0:14 / 1:30</span>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4 text-[0.7rem] text-[#64748B]">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Speech-to-text synced transcript
              </div>
            </section>

            {/* Pane 2: Code Editor */}
            <section aria-label="Code editor" className="landing-workspace-pane flex flex-col !p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs bg-white/[0.02]">
                <div className="flex items-center gap-2.5 text-[#CBD5E1]">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]/80" />
                  </div>
                  <span className="font-mono text-xs font-medium">solution.js</span>
                </div>
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-0.5 text-[0.65rem] font-mono text-[#67E8F9] border border-white/10">
                  <Code2 className="h-3 w-3" />
                  JavaScript
                </span>
              </div>

              <div
                data-landing-code-content
                className="min-h-0 flex-1 overflow-hidden px-4 py-3.5 font-mono text-[clamp(0.68rem,0.98vw,0.78rem)] leading-[1.8]"
              >
                {CODE_LINES.map((line, index) => (
                  <motion.div
                    key={line.text}
                    initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reducedMotion ? undefined : { delay: 0.7 + index * 0.1, duration: 0.24 }}
                    className={`flex min-w-0 max-w-full rounded px-1.5 py-0.5 ${index === 5 ? "bg-cyan-400/[0.1] border-l-2 border-cyan-400" : ""}`}
                  >
                    <span className="mr-3 w-4 shrink-0 select-none text-right text-[#475569]">{index + 1}</span>
                    <code className={`min-w-0 break-words whitespace-pre-wrap ${line.color}`}>{line.text}</code>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { delay: 1.7, duration: 0.25 }}
                className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-emerald-500/[0.04]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  4/4 test cases passed
                </span>
                <span className="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-300 border border-emerald-500/30">
                  Accepted (12ms)
                </span>
              </motion.div>
            </section>

            {/* Pane 3: Scorecard & Review */}
            <section aria-label="Answer review" className="landing-hero-review landing-workspace-pane flex flex-col p-4.5">
              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                transition={reducedMotion ? undefined : { delay: 1.9 }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F7FF]">
                  <Sparkles className="h-4 w-4 text-[#A78BFA]" />
                  Automated Evaluation
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#8E97AB]">
                  Instant rubric-based analysis of answer depth, logic, and delivery.
                </p>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { delay: 2.15, duration: 0.28 }}
                className="mt-4 flex items-end gap-2 rounded-xl bg-white/[0.04] p-3.5 border border-white/5"
              >
                <div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#94A3B8]">Overall Score</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black leading-none text-white">86</span>
                    <span className="text-xs text-[#64748B]">/100</span>
                  </div>
                </div>
                <span className="ml-auto rounded-full bg-blue-500/20 px-3 py-1 text-[0.65rem] font-bold text-blue-300 border border-blue-500/30">
                  Strong Pass
                </span>
              </motion.div>

              <div className="mt-4 space-y-3">
                {REVIEW_METRICS.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={reducedMotion ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reducedMotion ? undefined : { delay: 2.3 + index * 0.1, duration: 0.24 }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8]">{metric.label}</span>
                      <span className="font-semibold text-white">{metric.value}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { delay: 2.7, duration: 0.25 }}
                className="mt-auto border-t border-white/10 pt-3.5"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#CBD5E1]">
                  <Terminal className="h-3.5 w-3.5 text-[#67E8F9]" />
                  Key Coaching Note
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                  State your space complexity tradeoff upfront before diving into the hash map loop.
                </p>
              </motion.div>
            </section>
          </div>
        </div>

        <div className="landing-workspace-status flex flex-wrap items-center justify-center gap-5 border-t border-white/10 bg-white/[0.02] py-3.5 text-xs text-[#94A3B8]">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> Code compiled & tested in-browser
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> Video & voice recording saved
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> Adaptive follow-up generator
          </span>
        </div>
      </div>
    </div>
  );
}
