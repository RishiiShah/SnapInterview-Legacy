"use client";

import { motion, type Variants, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, Code2, MessageCircle, Sparkles, Terminal } from "lucide-react";

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
  { label: "Technical depth", value: 82, color: "bg-cyan-400" },
  { label: "Clarity", value: 90, color: "bg-violet-400" },
  { label: "Communication", value: 86, color: "bg-indigo-400" },
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
      className="relative mx-auto mt-[clamp(1.35rem,3vw,2.25rem)] w-full landing-container"
    >
      <div className="landing-workspace-frame">
        <div className="landing-workspace-shell">
          <div className="landing-workspace">
            <section aria-label="Interview conversation" className="landing-workspace-pane flex flex-col">
              <div className="flex items-center justify-between pb-2.5 text-xs text-[#8E97AB]">
                <span className="flex items-center gap-2 font-semibold text-[#F5F7FF]">
                  <MessageCircle className="h-3.5 w-3.5 text-[#A78BFA]" />
                  Example interview
                </span>
                <span className="text-[0.65rem] text-emerald-300/90">Sample question</span>
              </div>

              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                className="mt-3 rounded-lg border border-violet-400/15 bg-violet-500/[0.08] p-2.5"
              >
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#A78BFA]">Interviewer</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#E2E8F0]">
                  Implement a function that returns the first non-repeating character in a string.
                </p>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                transition={reducedMotion ? undefined : { delay: 0.35 }}
                className="mt-2.5 rounded-lg border border-cyan-400/12 bg-cyan-400/[0.05] p-2.5"
              >
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#67E8F9]">You</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#CBD5E1]">
                  I’ll count occurrences first, then scan the string again so the result stays linear and easy to
                  explain.
                </p>
              </motion.div>

              <div className="mt-auto flex items-center gap-2 pt-3 text-[0.7rem] text-[#657086]">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Example transcript
              </div>
            </section>

            <section aria-label="Code editor" className="landing-workspace-pane flex flex-col !p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-[#CBD5E1]">
                  <div className="flex gap-1" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-[#F87171]/75" />
                    <span className="h-2 w-2 rounded-full bg-[#FBBF24]/75" />
                    <span className="h-2 w-2 rounded-full bg-[#34D399]/75" />
                  </div>
                  solution.js
                </div>
                <span className="flex items-center gap-1 text-[0.65rem] text-[#8E97AB]">
                  <Code2 className="h-3 w-3 text-[#67E8F9]" />
                  JavaScript
                </span>
              </div>

              <div
                data-landing-code-content
                className="min-h-0 flex-1 overflow-hidden px-3 py-3 font-mono text-[clamp(0.6rem,0.95vw,0.74rem)] leading-[1.75]"
              >
                {CODE_LINES.map((line, index) => (
                  <motion.div
                    key={line.text}
                    initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reducedMotion ? undefined : { delay: 0.7 + index * 0.1, duration: 0.24 }}
                    className={`flex min-w-0 max-w-full rounded-sm px-1 ${index === 5 ? "bg-cyan-400/[0.07]" : ""}`}
                  >
                    <span className="mr-3 w-3.5 shrink-0 select-none text-right text-[#3D4F73]">{index + 1}</span>
                    <code className={`min-w-0 break-words whitespace-pre-wrap ${line.color}`}>{line.text}</code>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { delay: 1.7, duration: 0.25 }}
                className="flex items-center justify-between border-t border-white/10 px-3 py-2.5"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  4/4 passed
                </span>
                <span className="text-[0.65rem] font-semibold text-emerald-300">Accepted</span>
              </motion.div>
            </section>

            <section aria-label="Answer review" className="landing-hero-review landing-workspace-pane flex flex-col">
              <motion.div
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={sequence}
                transition={reducedMotion ? undefined : { delay: 1.9 }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F7FF]">
                  <Sparkles className="h-3.5 w-3.5 text-[#A78BFA]" />
                  Answer review
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8E97AB]">
                  An illustrative completed practice run scored across the answer, reasoning, and delivery.
                </p>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { delay: 2.15, duration: 0.28 }}
                className="mt-4 flex items-end gap-2"
              >
                <span className="text-[clamp(2rem,3.5vw,2.75rem)] font-bold leading-none text-[#F5F7FF]">86</span>
                <span className="pb-0.5 text-sm text-[#657086]">/100</span>
              </motion.div>

              <div className="mt-4 space-y-2.5">
                {REVIEW_METRICS.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={reducedMotion ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reducedMotion ? undefined : { delay: 2.3 + index * 0.1, duration: 0.24 }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8E97AB]">{metric.label}</span>
                      <span className="font-semibold text-[#E2E8F0]">{metric.value}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
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
                  Next focus
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#8E97AB]">
                  Explain the space tradeoff before you write the second pass.
                </p>
              </motion.div>
            </section>
          </div>
        </div>

        <div className="landing-workspace-status">
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> Code tested in-browser
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> Transcript saved
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> Follow-up ready
          </span>
        </div>
      </div>
    </div>
  );
}
