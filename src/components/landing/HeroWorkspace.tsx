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
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function HeroWorkspace() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div
      aria-label="Illustrative coding interview workspace"
      className="relative mx-auto mt-[clamp(2.5rem,6vw,4.5rem)] w-full landing-container"
    >
      <div className="absolute -inset-5 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.3)_0%,transparent_68%)] blur-3xl" />
      <div className="relative rounded-[clamp(1.25rem,2vw,2rem)] border border-white/15 bg-[rgba(20,33,61,0.58)] p-[clamp(0.65rem,1.4vw,1rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_60px_rgba(0,40,130,0.35)]">
        <div className="landing-workspace-shell">
          <div className="landing-workspace">
          <section
            aria-label="Interview conversation"
            className="flex min-h-[clamp(21rem,34vw,28rem)] flex-col overflow-hidden rounded-[clamp(0.85rem,1.5vw,1.25rem)] border border-white/10 bg-[#0A1224] p-[clamp(0.85rem,1.6vw,1.25rem)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs text-[#8E97AB]">
              <span className="flex items-center gap-2 font-semibold text-[#F5F7FF]">
                <MessageCircle className="h-4 w-4 text-[#A78BFA]" />
                Example interview
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[0.65rem] text-emerald-300">
                Sample question
              </span>
            </div>

            <motion.div
              initial={reducedMotion ? false : "hidden"}
              animate="visible"
              variants={sequence}
              className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3"
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">Interviewer</p>
              <p className="mt-2 text-sm leading-relaxed text-[#E2E8F0]">
                Implement a function that returns the first non-repeating character in a string.
              </p>
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : "hidden"}
              animate="visible"
              variants={sequence}
              transition={reducedMotion ? undefined : { delay: 0.45 }}
              className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] p-3"
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#67E8F9]">You</p>
              <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                I’ll count occurrences first, then scan the string again so the result stays linear and easy to explain.
              </p>
            </motion.div>

            <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-[#657086]">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
              Example transcript
            </div>
          </section>

          <section
            aria-label="Code editor"
            className="flex min-h-[clamp(21rem,34vw,28rem)] flex-col overflow-hidden rounded-[clamp(0.85rem,1.5vw,1.25rem)] border border-white/10 bg-[#070D1A]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 text-xs">
              <div className="flex items-center gap-2 text-[#CBD5E1]">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]/80" />
                </div>
                solution.js
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] text-[#8E97AB]">
                <Code2 className="h-3 w-3 text-[#67E8F9]" />
                JavaScript
              </span>
            </div>

            <div
              data-landing-code-content
              className="min-h-0 flex-1 overflow-hidden px-3 py-4 font-mono text-[clamp(0.62rem,1vw,0.78rem)] leading-[1.8]"
            >
              {CODE_LINES.map((line, index) => (
                <motion.div
                  key={line.text}
                  initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={reducedMotion ? undefined : { delay: 0.85 + index * 0.12, duration: 0.28 }}
                  className={`flex min-w-0 max-w-full rounded-md px-1 ${index === 5 ? "bg-cyan-400/[0.08]" : ""}`}
                >
                  <span className="mr-4 w-4 shrink-0 select-none text-right text-[#3D4F73]">{index + 1}</span>
                  <code className={`min-w-0 break-words whitespace-pre-wrap ${line.color}`}>{line.text}</code>
                  {index === 5 && <span className="ml-1 inline-block w-px bg-cyan-300 motion-safe:animate-pulse" aria-hidden="true" />}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { delay: 2.05, duration: 0.3 }}
              className="flex items-center justify-between border-t border-white/10 bg-[#0B1425] px-3 py-3"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                4/4 passed
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[0.65rem] font-semibold text-emerald-300">
                Accepted
              </span>
            </motion.div>
          </section>

          <section
            aria-label="Answer review"
            className="landing-hero-review flex min-h-[clamp(21rem,34vw,28rem)] flex-col rounded-[clamp(0.85rem,1.5vw,1.25rem)] border border-violet-400/30 bg-[rgba(18,24,48,0.92)] p-[clamp(0.85rem,1.6vw,1.25rem)] shadow-[0_0_28px_rgba(120,70,255,0.18)]"
          >
            <motion.div
              initial={reducedMotion ? false : "hidden"}
              animate="visible"
              variants={sequence}
              transition={reducedMotion ? undefined : { delay: 2.35 }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F7FF]">
                <Sparkles className="h-4 w-4 text-[#A78BFA]" />
                Answer review
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.6rem] font-medium text-[#8E97AB]">
                  Example
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#8E97AB]">
                An illustrative completed practice run scored across the answer, reasoning, and delivery.
              </p>
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { delay: 2.65, duration: 0.35 }}
              className="mt-5 flex items-end gap-2"
            >
              <span className="text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-none text-[#F5F7FF]">86</span>
              <span className="pb-1 text-sm text-[#657086]">/100</span>
              <span className="mb-1 ml-auto rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[0.65rem] font-semibold text-emerald-300">
                Sample result
              </span>
            </motion.div>

            <div className="mt-5 space-y-3">
              {REVIEW_METRICS.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={reducedMotion ? false : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={reducedMotion ? undefined : { delay: 2.85 + index * 0.12, duration: 0.28 }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8E97AB]">{metric.label}</span>
                    <span className="font-semibold text-[#E2E8F0]">{metric.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { delay: 3.3, duration: 0.3 }}
              className="mt-auto rounded-xl border border-white/10 bg-white/[0.04] p-3"
            >
              <p className="flex items-center gap-2 text-xs font-semibold text-[#CBD5E1]">
                <Terminal className="h-3.5 w-3.5 text-[#67E8F9]" />
                Next focus
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8E97AB]">
                Explain the space tradeoff before you write the second pass.
              </p>
            </motion.div>
          </section>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.65rem] text-[#657086]">
          <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Code tested in-browser</span>
          <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Transcript saved</span>
          <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Follow-up ready</span>
        </div>
      </div>
    </div>
  );
}
