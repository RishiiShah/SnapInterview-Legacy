"use client";

import { useState } from "react";
import { FileText, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { LandingFadeIn, LandingFadeOnly, LandingScaleIn } from "./LandingMotion";

const FEATURES = [
  {
    number: "001",
    label: "Voice dialogue",
    accent: "text-violet-400",
    badge: "Adaptive interviewer",
    title: "Speaks like a real interviewer",
    description:
      "The AI listens to your full response, picks up on vague reasoning or missed edge cases, and follows up with targeted probes. It does not move on until you have addressed the question.",
    diagram: "voice",
  },
  {
    number: "002",
    label: "Coding concepts",
    accent: "text-sky-400",
    badge: "Read-only workspace",
    title: "Study coding patterns in context",
    description:
      "Review read-only JavaScript problem previews with constraints, topics, hints, and public sample cases. Use them to discuss an approach without simulated execution or grading.",
    diagram: "coding",
  },
  {
    number: "003",
    label: "Session replay",
    accent: "text-indigo-400",
    badge: "Full session recording",
    title: "Review exactly what you said",
    description:
      "Every session records video, audio, and a word-level transcript. Scrub to any moment and see what you said, what the AI asked next, and where the conversation turned.",
    diagram: "replay",
  },
  {
    number: "004",
    label: "Role context",
    accent: "text-emerald-400",
    badge: "Tailored to your target",
    title: "Questions shaped by your context",
    description:
      "Paste a job description, upload your resume, or pick a target level. The system generates questions that reflect what that company actually asks at that seniority.",
    diagram: "context",
  },
] as const;

const TRACKS = [
  {
    id: "swe",
    title: "Software Engineering",
    badge: "Most Popular",
    color: "text-sky-400",
    dot: "bg-sky-400",
    topics: ["Data Structures and Algorithms", "System Design", "Coding Discussion on Mic", "Complexity Analysis"],
    question: "How would you design a distributed rate limiter that handles 100,000 requests per second across multiple data centers?",
  },
  {
    id: "system-design",
    title: "System Design",
    badge: "Senior / Staff",
    color: "text-violet-400",
    dot: "bg-violet-400",
    topics: ["Scalability and Caching", "Database Sharding", "API Gateway Design", "Event-Driven Architecture"],
    question: "Design a fault-tolerant notification system with guaranteed delivery, retry mechanisms, and backpressure handling.",
  },
  {
    id: "pm",
    title: "Product Management",
    badge: "Product Track",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    topics: ["Product Sense and Metrics", "Execution and Tradeoffs", "Stakeholder Alignment", "User Research and Case Studies"],
    question: "How would you define and measure success for a new AI-powered feature shipping to 10 million users?",
  },
  {
    id: "data",
    title: "Data Science and ML",
    badge: "AI / Data",
    color: "text-amber-400",
    dot: "bg-amber-400",
    topics: ["ML Model Design", "SQL and ETL Pipelines", "A/B Testing and Statistics", "Feature Engineering"],
    question: "Walk me through how you would handle severe class imbalance in a production fraud detection model.",
  },
  {
    id: "behavioral",
    title: "Behavioral and Leadership",
    badge: "All Levels",
    color: "text-rose-400",
    dot: "bg-rose-400",
    topics: ["STAR Method Delivery", "Conflict Resolution", "Project Failure Retrospectives", "Cross-Functional Influence"],
    question: "Tell me about a time you had a significant disagreement with your tech lead. What was the outcome?",
  },
];

function VoiceConversationDiagram() {
  return (
    <div aria-hidden="true" className="mt-4 border-t border-white/[0.08] pt-3 space-y-2">
      <div className="rounded-lg bg-[#0A0C14] border border-white/[0.06] p-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold tracking-wide text-violet-300 bg-violet-500/15">AI</span>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">
            You mentioned O(n) space. What happens if the input contains duplicates?
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold tracking-wide text-slate-400 bg-slate-500/15">Me</span>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">
            Good point. I&apos;ll use a hash set to track seen elements so duplicate lookups stay O(1).
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold tracking-wide text-violet-300 bg-violet-500/15">AI</span>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">
            Right. What is your overall time complexity after that adjustment?
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold tracking-wide text-slate-400 bg-slate-500/15">Me</span>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">
            It remains O(n) overall, since set insertion and lookup both run in amortized constant time.
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-4 w-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold tracking-wide text-violet-300 bg-violet-500/15">AI</span>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">
            Spot on. Can you now optimize this to O(1) auxiliary space using two pointers?
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[0.7rem] text-[#B8C0CE]">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        Live microphone active
      </div>
    </div>
  );
}

function CodingDiagram() {
  return (
    <div aria-hidden="true" className="mt-4 border-t border-white/[0.08] pt-3 space-y-2">
      <div className="flex items-center justify-between text-[0.7rem] text-[#B8C0CE]">
        <span className="font-mono">concept.js</span>
        <span className="text-sky-400 font-medium">Concept preview</span>
      </div>
      <div className="rounded-lg bg-[#0A0C14] border border-white/[0.06] px-3.5 py-2.5 font-mono text-xs space-y-1">
        <div className="flex gap-4">
          <span className="text-[#B0B8C8] w-4 shrink-0">1</span>
          <span><span className="text-sky-300">function</span> <span className="text-slate-200">twoSum</span><span className="text-slate-400">(nums, target) &#123;</span></span>
        </div>
        <div className="flex gap-4">
          <span className="text-[#B0B8C8] w-4 shrink-0">2</span>
          <span className="text-slate-400 pl-4">const seen = new Map();</span>
        </div>
        <div className="flex gap-4">
          <span className="text-[#B0B8C8] w-4 shrink-0">3</span>
          <span className="pl-4"><span className="text-sky-300">for</span> <span className="text-slate-400">(let i = 0; i &lt; nums.length; i++) &#123;</span></span>
        </div>
        <div className="flex gap-4">
          <span className="text-[#B0B8C8] w-4 shrink-0">4</span>
          <span className="pl-8 text-slate-400">const complement = target - nums[i];</span>
        </div>
        <div className="flex gap-4">
          <span className="text-[#B0B8C8] w-4 shrink-0">5</span>
          <span className="pl-8"><span className="text-sky-300">if</span> <span className="text-slate-400">(seen.has(complement)) return [seen.get(complement), i];</span></span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[0.7rem] text-[#B8C0CE]">
        Public sample: [2,7,11,15] + 9 → [0,1]
      </div>
    </div>
  );
}

function ReplayDiagram() {
  return (
    <div aria-hidden="true" className="mt-4 border-t border-white/[0.08] pt-3 space-y-2">
      <div className="rounded-lg bg-[#0A0C14] border border-white/[0.06] p-3 space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[0.7rem] text-[#B8C0CE]">
            <span className="font-mono">session_2024-07-30.mp4</span>
            <span className="font-mono">04:27 / 18:12</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-indigo-500/70" style={{ width: "24%" }} />
          </div>
        </div>
        <div className="border-t border-white/[0.06] pt-2 space-y-1">
          <div className="flex gap-2 text-xs">
            <span className="font-mono text-[#B8C0CE] shrink-0">04:12</span>
            <span className="text-[#CBD5E1]">Candidate hesitates on space complexity for sliding window.</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-mono text-[#B8C0CE] shrink-0">04:27</span>
            <span className="text-[#CBD5E1]">AI asks a follow-up about auxiliary space vs input space.</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[0.7rem] text-[#B8C0CE]">
        <Clock className="h-3 w-3" />
        Transcript synced to playback position
      </div>
    </div>
  );
}

function ContextDiagram() {
  return (
    <div aria-hidden="true" className="mt-4 border-t border-white/[0.08] pt-3 space-y-2">
      <div className="rounded-lg bg-[#0A0C14] border border-white/[0.06] p-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
            <FileText className="h-3 w-3" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#CBD5E1]">Staff Software Engineer, Stripe</p>
            <p className="text-[0.68rem] text-[#B8C0CE]">Resume and job description uploaded</p>
          </div>
        </div>
        <div className="border-t border-white/[0.06] pt-2 space-y-1">
          <p className="text-[0.65rem] font-medium text-[#B8C0CE] uppercase tracking-wider">Generated focus areas</p>
          <div className="flex flex-wrap gap-1.5">
            {["Distributed systems", "API reliability", "Payment infra", "Cross-team leadership"].map((t) => (
              <span key={t} className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[0.68rem] text-[#A8B6C8]">{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[0.7rem] text-[#B8C0CE]">
        <CheckCircle className="h-3 w-3 text-emerald-500" />
        Questions tailored to your specific interview target
      </div>
    </div>
  );
}

function TracksCard() {
  const [activeTrack, setActiveTrack] = useState(TRACKS[0]);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0F1A]">
      <div className="flex flex-col lg:flex-row">

        {/* Left sidebar */}
        <div className="lg:w-64 xl:w-72 shrink-0 border-b border-white/[0.07] lg:border-b-0 lg:border-r p-4 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-rose-400">
            Specialized Tracks
          </p>
          {TRACKS.map((track) => {
            const isActive = activeTrack.id === track.id;
            return (
              <button
                key={track.id}
                onClick={() => setActiveTrack(track)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-[#B8C0CE] hover:text-[#E8ECF4] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? track.dot : "bg-white/20"}`} />
                  <span className="text-sm font-medium">{track.title}</span>
                </div>
                {isActive && <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${track.color}`} />}
              </button>
            );
          })}
          <p className="pt-2 text-[0.7rem] text-[#B0B8C8] leading-relaxed">28+ tracks covering every role, level, and domain.</p>
        </div>

        {/* Right detail panel */}
        <div className="flex-1 p-5 lg:p-6 space-y-4">
          <div>
            <span className={`text-xs font-semibold ${activeTrack.color}`}>{activeTrack.badge}</span>
            <h3 className="mt-0.5 font-serif text-2xl font-normal leading-snug tracking-tight text-white sm:text-3xl">{activeTrack.title}</h3>
          </div>

          <div className="space-y-2">
            <p className="text-[0.68rem] font-medium uppercase tracking-wider text-[#B8C0CE]">Core evaluated skills</p>
            <div className="flex flex-wrap gap-2">
              {activeTrack.topics.map((topic) => (
                <span key={topic} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[#CBD5E1]">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${activeTrack.dot}`} />
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#070910] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[0.68rem]">
              <span className="font-mono text-[#B0B8C8]">Sample AI prompt</span>
              <span className={`font-medium ${activeTrack.color}`}>Adaptive probe active</span>
            </div>
            <p className="text-sm leading-relaxed text-[#CBD5E1]">
              {activeTrack.question}
            </p>
          </div>
        </div>

      </div>
    </article>
  );
}

export default function ProductStrengthsSection() {
  return (
    <section id="features" className="landing-section relative z-10 bg-[#090A0F] py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header — R→L title (opposite of Studio) */}
        <div className="mb-5 border-t border-white/[0.08] pt-5 space-y-2.5 flex flex-col items-center text-center">
          <LandingFadeOnly triggerOnView>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              Product Strengths
            </span>
          </LandingFadeOnly>
          <LandingFadeOnly triggerOnView delay={0.07}>
            <h2 className="font-serif text-3xl leading-tight tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
              Built for every interview moment that matters.
            </h2>
          </LandingFadeOnly>
          <LandingFadeOnly triggerOnView delay={0.38} className="max-w-4xl">
            <p className="text-sm leading-relaxed text-[#CBD5E1]">
              SnapInterview gives you a place to practice speaking, study coding concepts, and review sessions across every role and seniority level.
            </p>
          </LandingFadeOnly>
        </div>

          {/* Feature cards — alternate L→R / R→L fade */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">

          {FEATURES.map((feature, index) => {
            return (
              <LandingFadeIn
                key={feature.number}
                triggerOnView
                direction={index % 2 === 0 ? "right" : "left"}
                delay={0.08 * (index % 2)}
                className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0F1A] p-5 sm:p-5.5 ${
                  feature.number === "001" || feature.number === "004" ? "lg:col-span-7" : "lg:col-span-5"
                }`}
              >
                <p className={`text-[0.7rem] font-semibold uppercase tracking-wider ${feature.accent}`}>
                  {feature.badge}
                </p>
                <h3 className="mt-1.5 font-serif text-2xl leading-[1.05] tracking-tight text-white sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#CBD5E1]">
                  {feature.description}
                </p>

                {feature.diagram === "voice" && <VoiceConversationDiagram />}
                {feature.diagram === "coding" && <CodingDiagram />}
                {feature.diagram === "replay" && <ReplayDiagram />}
                {feature.diagram === "context" && <ContextDiagram />}
              </LandingFadeIn>
            );
          })}

          {/* Tracks — soft scale */}
          <LandingScaleIn
            triggerOnView
            delay={0.14}
            scaleFrom={0.98}
            className="col-span-1 sm:col-span-2 lg:col-span-12"
          >
            <TracksCard />
          </LandingScaleIn>

        </div>
      </div>
    </section>
  );
}
