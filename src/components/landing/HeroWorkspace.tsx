"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  MessageCircle,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Video,
  Volume2,
} from "lucide-react";

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
  { label: "Technical depth & correctness", value: 88, color: "from-cyan-500 to-blue-500" },
  { label: "Communication & structure", value: 92, color: "from-violet-500 to-purple-500" },
  { label: "Problem-solving & logic", value: 85, color: "from-indigo-500 to-blue-600" },
];

export default function HeroWorkspace() {
  const [activeTab, setActiveTab] = useState<"transcript" | "code" | "evaluation">("code");

  return (
    <div
      data-landing-hero-workspace
      aria-label="Interactive mock interview workspace studio"
      className="relative mx-auto w-full landing-container"
    >
      {/* Header section above workspace studio */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          Live Interactive Studio
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          See how your interview unfolds
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[#94A3B8]">
          Experience the simulated interface: video call, speech transcript, code editor, and instant AI rubric evaluation.
        </p>
      </div>

      {/* Main Studio Frame */}
      <div className="landing-workspace-frame relative overflow-hidden rounded-3xl border border-white/15 bg-[#0A0C16]/90 shadow-[0_35px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        {/* Glow accent along top border */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />

        {/* Studio Window Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#06070E] px-5 py-3.5 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-3">
            <div className="flex gap-2" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
              <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
              <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
            </div>
            <span className="h-4 w-px bg-white/10" />
            <span className="font-mono text-xs font-semibold text-white">
              SnapInterview Studio v2.4
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.65rem] font-medium text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Session Live (04:12)
            </span>
          </div>

          {/* Tab Switcher for mobile & desktop focus */}
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === "code" ? "bg-blue-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code Editor
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === "transcript" ? "bg-blue-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Voice Transcript
            </button>
            <button
              onClick={() => setActiveTab("evaluation")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === "evaluation" ? "bg-blue-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Scorecard
            </button>
          </div>
        </div>

        {/* 3-Column Grid View */}
        <div className="landing-workspace-shell">
          <div className="landing-workspace grid grid-cols-1 divide-y divide-white/10 lg:grid-cols-3 lg:divide-y-0 lg:divide-x">
            
            {/* COLUMN 1: AI Interviewer Video & Transcript */}
            <section aria-label="Interview conversation" className="landing-workspace-pane flex flex-col p-5 bg-[#090B14]">
              {/* AI Interviewer Video Box */}
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#121524] to-[#0A0C16] p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white shadow-md">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-white">AI Interviewer</span>
                      <span className="block text-[0.65rem] text-[#94A3B8]">Senior Staff Engineer</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-300 border border-violet-500/30">
                    Speaking...
                  </span>
                </div>

                <div className="rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-[#E2E8F0] border border-white/5">
                  <span className="font-semibold text-violet-400">Question: </span>
                  "Implement a function that returns the first non-repeating character in a string. Walk me through your logic."
                </div>

                {/* Animated Voice Waveform */}
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.04] p-2 border border-white/5">
                  <Volume2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <div className="flex flex-1 items-center gap-0.5 h-4">
                    {[40, 80, 45, 95, 60, 100, 35, 75, 50, 90, 40, 85, 65, 45, 95, 50].map((h, idx) => (
                      <span
                        key={idx}
                        className="flex-1 rounded-full bg-violet-400/80 animate-pulse"
                        style={{ height: `${h}%`, animationDelay: `${idx * 0.08}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-[0.65rem] font-mono text-[#94A3B8]">0:14 / 1:30</span>
                </div>
              </div>

              {/* Candidate Response Transcript Box */}
              <div className="mt-4 flex-1 rounded-xl border border-white/10 bg-[#06070E] p-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#67E8F9]">
                    <Mic className="h-3.5 w-3.5" /> Candidate Response
                  </span>
                  <span className="text-[0.65rem] text-emerald-400">Mic Open</span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#CBD5E1]">
                  "I’ll count character occurrences in a hash map first, then scan the string a second time so the result stays linear $O(N)$ and easy to explain."
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-[0.7rem] text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Speech synced in real-time
                </span>
              </div>
            </section>

            {/* COLUMN 2: In-Browser Code Editor */}
            <section aria-label="Code editor" className="landing-workspace-pane flex flex-col !p-0 bg-[#080912]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-[#CBD5E1]">
                  <Code2 className="h-4 w-4 text-blue-400" />
                  <span className="font-mono text-xs font-semibold text-white">solution.js</span>
                </div>
                <span className="rounded-md bg-blue-500/20 px-2.5 py-0.5 text-[0.65rem] font-mono text-blue-300 border border-blue-500/30">
                  JavaScript ES6
                </span>
              </div>

              <div
                data-landing-code-content
                className="min-h-[220px] flex-1 overflow-hidden px-4 py-4 font-mono text-[clamp(0.7rem,0.98vw,0.8rem)] leading-[1.85]"
              >
                {CODE_LINES.map((line, index) => (
                  <div
                    key={line.text}
                    className={`flex min-w-0 max-w-full rounded px-2 py-0.5 ${
                      index === 5 ? "bg-cyan-400/[0.12] border-l-2 border-cyan-400" : ""
                    }`}
                  >
                    <span className="mr-3.5 w-4 shrink-0 select-none text-right text-[#475569]">{index + 1}</span>
                    <code className={`min-w-0 break-words whitespace-pre-wrap ${line.color}`}>{line.text}</code>
                  </div>
                ))}
              </div>

              {/* Test Case Execution Output Bar */}
              <div className="border-t border-white/10 bg-[#05060C] p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> 4/4 Test Cases Passed
                  </span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300 border border-emerald-500/30">
                    Passed (12ms)
                  </span>
                </div>
              </div>
            </section>

            {/* COLUMN 3: AI Rubric Evaluation Scorecard */}
            <section aria-label="Answer review" className="landing-hero-review landing-workspace-pane flex flex-col p-5 bg-[#090B14]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-[#A78BFA]" />
                  Automated Evaluation
                </div>
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[0.65rem] font-bold text-blue-300 border border-blue-500/30">
                  Strong Pass
                </span>
              </div>

              {/* Score Display Box */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.04] p-4 border border-white/10">
                <div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#94A3B8]">Overall Rating</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black leading-none text-white">86</span>
                    <span className="text-sm text-[#64748B]">/100</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full border-4 border-blue-500 flex items-center justify-center font-bold text-xs text-white">
                  Top 8%
                </div>
              </div>

              {/* Dimension Metrics */}
              <div className="mt-5 space-y-3.5">
                {REVIEW_METRICS.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#CBD5E1]">{metric.label}</span>
                      <span className="font-mono font-bold text-white">{metric.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full bg-gradient-to-r ${metric.color}`} style={{ width: `${metric.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Coaching Recommendation */}
              <div className="mt-auto pt-4 border-t border-white/10">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#67E8F9]">
                  <Terminal className="h-3.5 w-3.5" /> Next Focus Point
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                  State your space complexity tradeoff upfront before writing your second map traversal.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Workspace Status Bar */}
        <div className="landing-workspace-status flex flex-wrap items-center justify-center gap-6 border-t border-white/10 bg-[#06070E] py-4 text-xs text-[#94A3B8]">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" /> In-browser Code Execution
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" /> Synced Video & Speech Transcript
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" /> Instant Rubric Feedback
          </span>
        </div>
      </div>
    </div>
  );
}
