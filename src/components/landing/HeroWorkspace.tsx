"use client";

import {
  CheckCircle2,
  Code2,
  Cpu,
  Mic,
  Play,
  Send,
  Video,
  Volume2,
} from "lucide-react";
import { Safari } from "@/components/ui/Safari";
import { LandingFadeOnly } from "./LandingMotion";

const CODE_LINES = [
  { text: "def two_sum(nums: list[int], target: int) -> list[int]:", color: "text-[#8BA7C7]" },
  { text: "    seen = {}", color: "text-[#B8C4D4]" },
  { text: "    for idx, num in enumerate(nums):", color: "text-[#8BA7C7]" },
  { text: "        complement = target - num", color: "text-[#C8D3E0]" },
  { text: "        if complement in seen:", color: "text-[#8BA7C7]" },
  { text: "            return [seen[complement], idx]", color: "text-[#8ABDC8]" },
  { text: "        seen[num] = idx", color: "text-[#C8D3E0]" },
  { text: "    return []", color: "text-[#8BA7C7]" },
];

export default function HeroWorkspace() {
  return (
    <div
      data-landing-hero-workspace
      aria-label="Interactive mock interview workspace studio"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      {/* Section Header — L→R title, quiet lede */}
      <div className="mb-10 flex flex-col items-center text-center pt-4">
        <LandingFadeOnly triggerOnView>
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#9BB8D4]">
            Interactive Studio
          </span>
        </LandingFadeOnly>
        <LandingFadeOnly triggerOnView delay={0.11} className="mt-3">
          <h2 className="text-3xl font-semibold tracking-tight text-[#D8E0EC] sm:text-4xl lg:text-5xl">
            Step inside the room before the interview begins
          </h2>
        </LandingFadeOnly>
        <LandingFadeOnly triggerOnView delay={0.19} className="mt-3 max-w-2xl">
          <p className="text-base leading-relaxed text-[#A8B6C8]">
            A live coding environment, speech-to-text transcript, and automated feedback system operating in real time.
          </p>
        </LandingFadeOnly>
      </div>

      {/* Outer Soft Glow */}
      <div className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-indigo-900/20 blur-[150px]"
          aria-hidden="true"
        />

        {/* Safari frame — soft fade in */}
        <LandingFadeOnly triggerOnView delay={0.14}>
        <Safari url="snapinterview.app/practice/session" className="shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          {/* Workspace — unified muted dark surface, no sharp card borders */}
          <div className="flex flex-col h-full w-full bg-[#0D1017] text-[#C8D3E0] select-none font-sans">

            {/* Top Session Bar */}
            <div className="flex flex-wrap items-center justify-between bg-[#0A0D13] border-b border-white/[0.07] px-6 py-3 text-xs">
              <span className="font-mono text-xs font-medium text-[#A8B8CC]">
                Active Practice Session
              </span>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[0.7rem] text-[#9AABC0]">Question 2 of 4</span>
                  <div className="h-1 w-14 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-1/2 rounded-full bg-[#4A6FA5]/70" />
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-[#7A4A4A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8B5A5A] animate-pulse" />
                  REC 04:12
                </span>
              </div>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x divide-white/[0.06] border-b border-white/[0.06] flex-1">

              {/* LEFT PANEL — no card boxes, just gentle section dividers */}
              <div className="lg:col-span-5 flex flex-col bg-[#0D1017] px-5 py-5 space-y-5">

                {/* Problem Statement */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#C8D3E0]">1. Two Sum</h3>
                      <span className="text-xs text-[#8FA0B4]">Data Structures & Algorithms</span>
                    </div>
                    <span className="rounded px-2 py-0.5 text-xs font-medium text-[#A08050] bg-[#1A1610]">
                      Medium
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#A8B6C8]">
                    Given an array of integers{" "}
                    <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.7rem] text-[#8BA7C7]">nums</code>{" "}
                    and an integer{" "}
                    <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.7rem] text-[#8BA7C7]">target</code>
                    , return indices of the two numbers that add up to target.
                  </p>

                  <div className="rounded-md bg-[#090C12] px-3 py-2.5 font-mono text-xs text-[#9AABC0] space-y-1">
                    <div><span className="text-[#8AABCD]">Input:</span> nums = [2,7,11,15], target = 9</div>
                    <div><span className="text-[#8AABCD]">Output:</span> <span className="text-[#6A9A7A]">[0,1]</span></div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.06]" />

                {/* AI Interviewer */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E2440] text-[#9AABD0]">
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium text-[#A8B6C8]">AI Interviewer</span>
                    </div>
                    <span className="flex items-center gap-1 text-[0.65rem] text-[#9AABC0]">
                      <Volume2 className="h-3 w-3" /> Speaking
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#C0CAD6]">
                    "Walk me through your logic for avoiding an O(N²) quadratic brute-force check."
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.06]" />

                {/* Candidate Transcript */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-[#8AB8B0]">
                      <Mic className="h-3 w-3" /> Candidate
                    </span>
                    <span className="text-[0.65rem] text-[#7FA892]">● Live</span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#A8B6C8]">
                    "I'll use a hash map to store each number and its index. As I iterate through the array, I can check if the complement already exists in O(1) time."
                  </p>
                </div>

              </div>

              {/* RIGHT PANEL — Code Editor */}
              <div className="lg:col-span-7 flex flex-col bg-[#0B0E15]">

                {/* Tab Bar */}
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#090C12] px-5 py-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-[#A8B6C8] border-b border-[#4A6FA5]/50">
                    <Code2 className="h-3.5 w-3.5 text-[#8AABCD]" />
                    solution.py
                  </div>
                  <span className="text-[0.65rem] font-mono text-[#8FA0B4] bg-[#0D1017] px-2 py-0.5 rounded">
                    Python 3.11
                  </span>
                </div>

                {/* Code */}
                <div className="min-h-[190px] flex-1 px-6 py-3.5 font-mono text-xs leading-[1.8]">
                  {CODE_LINES.map((line, index) => (
                    <div key={line.text} className="flex min-w-0 max-w-full">
                      <span className="mr-5 w-4 shrink-0 select-none text-right text-[#6B7C90]">{index + 1}</span>
                      <code className={`min-w-0 break-words whitespace-pre-wrap ${line.color}`}>{line.text}</code>
                    </div>
                  ))}
                </div>

                {/* Terminal / Controls */}
                <div className="border-t border-white/[0.06] bg-[#090C12] px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#8ABC9A]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      4/4 Test Cases Passed · 8ms
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-1.5 text-xs text-[#A8B6C8] hover:bg-white/10 transition">
                        <Play className="h-3 w-3 fill-current" /> Run
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3060] px-3.5 py-1.5 text-xs text-[#8AAAD0] hover:bg-[#263870] transition">
                        <Send className="h-3 w-3" /> Submit
                      </button>
                    </div>
                  </div>

                  <div className="rounded-md bg-[#080B10] px-3 py-2.5 font-mono text-xs text-[#7FA892] space-y-1">
                    <div>✓ two_sum([2,7,11,15], 9) == [0,1]</div>
                    <div>✓ two_sum([3,2,4], 6) == [1,2]</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="flex flex-wrap items-center justify-between bg-[#0A0D13] border-t border-white/[0.06] px-6 py-2.5 text-xs text-[#8FA0B4]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <Mic className="h-3 w-3 text-[#7FB892]" /> Mic Enabled
                </span>
                <span className="flex items-center gap-1.5">
                  <Video className="h-3 w-3 text-[#8FA0C0]" /> Camera HD
                </span>
              </div>
              <div className="flex items-center gap-5">
                <span className="text-[#7FA892]">Rubric Active</span>
                <span>Latency: 18ms</span>
              </div>
            </div>

          </div>
        </Safari>
        </LandingFadeOnly>
      </div>
    </div>
  );
}
