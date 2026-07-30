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
  { label: "Technical depth", value: 82, color: "bg-[#22D3EE]" },
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
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">
          Interactive Demo
        </span>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
          Inside a SnapInterview session
        </h2>
        <p className="mt-1 text-xs text-[#94A3B8] sm:text-sm">
          Simulated live interview workspace with code editor, audio transcript, and automated feedback.
        </p>
      </div>

      <div className="landing-workspace-frame relative rounded-2xl border border-white/15 bg-[#0D0E15]/90 shadow-[0_25px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* Glow accent line along top edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="landing-workspace-shell">
          <div className="landing-workspace">
            
            {/* Column 1: Interview Transcript & Voice */}
            <section aria-label="Interview conversation" className="landing-workspace-pane flex flex-col p-4">
              <div className="flex items-center justify-between pb-3 text-xs text-[#8E97AB] border-b border-white/10">
                <span className="flex items-center gap-2 font-semibold text-[#F5F7FF]">
                  <MessageCircle className="h-4 w-4 text-[#A78BFA]" />
                  Live Interview Session
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live AI Voice
                </span>
              </div>

              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                className="mt-3.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#A78BFA]">
                    Interviewer (AI)
                  </p>
                  <Volume2 className="h-3 w-3 text-[#A78BFA]/70" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#E2E8F0]">
                  Implement a function that returns the first non-repeating character in a string.
                </p>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                transition={reducedMotion ? undefined : { delay: 0.35 }}
                className="mt-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#67E8F9]">
                    You (Candidate)
                  </p>
                  <Mic className="h-3 w-3 text-[#67E8F9]/70" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#CBD5E1]">
                  I’ll count occurrences first, then scan the string again so the result stays linear and easy to explain.
                </p>
              </motion.div>

              {/* Audio waveform mockup */}
              <div className="mt-4 rounded-lg bg-white/[0.03] p-2 border border-white/5 flex items-center gap-2">
                <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                </button>
                <div className="flex flex-1 items-center gap-0.5 h-4">
                  {[40, 75, 30, 90, 60, 100, 45, 80, 50, 70, 35, 85, 60, 40, 95, 50, 30, 70, 40].map((h, idx) => (
                    <span
                      key={idx}
                      className="flex-1 rounded-full bg-blue-400/60"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <span className="text-[0.65rem] font-mono text-[#657086]">0:14 / 1:30</span>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-3 text-[0.7rem] text-[#657086]">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Real-time speech-to-text transcript
              </div>
            </section>

            {/* Column 2: Code Editor */}
            <section aria-label="Code editor" className="landing-workspace-pane flex flex-col !p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5 text-xs bg-white/[0.02]">
                <div className="flex items-center gap-2 text-[#CBD5E1]">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]/80" />
                  </div>
                  <span className="font-mono text-xs font-medium">solution.js</span>
                </div>
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[0.65rem] font-mono text-[#67E8F9] border border-white/10">
                  <Code2 className="h-3 w-3" />
                  JavaScript
                </span>
              </div>

              <div
                data-landing-code-content
                className="min-h-0 flex-1 overflow-hidden px-3.5 py-3 font-mono text-[clamp(0.65rem,0.95vw,0.76rem)] leading-[1.8]"
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
                className="flex items-center justify-between border-t border-white/10 px-3.5 py-2.5 bg-emerald-500/[0.04]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  4/4 test cases passed
                </span>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300 border border-emerald-500/30">
                  Accepted (12ms)
                </span>
              </motion.div>
            </section>

            {/* Column 3: Automated Evaluation Scorecard */}
            <section aria-label="Answer review" className="landing-hero-review landing-workspace-pane flex flex-col p-4">
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
                className="mt-3.5 flex items-end gap-2 rounded-xl bg-white/[0.04] p-3 border border-white/5"
              >
                <div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#94A3B8]">Overall Score</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black leading-none text-white">86</span>
                    <span className="text-xs text-[#64748B]">/100</span>
                  </div>
                </div>
                <span className="ml-auto rounded-full bg-blue-500/20 px-2.5 py-1 text-[0.65rem] font-bold text-blue-300 border border-blue-500/30">
                  Strong Pass
                </span>
              </motion.div>

              <div className="mt-3.5 space-y-2.5">
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
                className="mt-auto border-t border-white/10 pt-3"
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

        <div className="landing-workspace-status flex flex-wrap items-center justify-center gap-4 border-t border-white/10 bg-white/[0.02] py-3 text-xs text-[#94A3B8]">
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
