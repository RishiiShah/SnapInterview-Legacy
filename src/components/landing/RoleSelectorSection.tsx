"use client";

import { useState } from "react";
import { ArrowRight, Code, Database, Layers, MessageSquare, UserCheck } from "lucide-react";
import Link from "next/link";

const ROLES = [
  {
    id: "swe",
    title: "Software Engineering",
    icon: Code,
    color: "from-blue-500 to-cyan-500",
    badge: "Most Popular",
    topics: ["Data Structures & Algorithms", "System Design", "Coding Discussion on Mic", "Time & Space Complexity"],
    questionPreview: "How would you design a distributed rate limiter for 100,000 requests/sec?",
  },
  {
    id: "system-design",
    title: "System Design & Architecture",
    icon: Layers,
    color: "from-violet-500 to-purple-500",
    badge: "Senior / Staff",
    topics: ["Scalability & Caching", "Database Sharding", "API Gateways", "Event-Driven Architecture"],
    questionPreview: "Design a fault-tolerant notification system with retry mechanisms and queueing.",
  },
  {
    id: "pm",
    title: "Product Management",
    icon: MessageSquare,
    color: "from-emerald-500 to-teal-500",
    badge: "Product Track",
    topics: ["Product Sense & Metrics", "Execution & Tradeoffs", "Behavioral Leadership", "User Case Studies"],
    questionPreview: "How would you measure success for Spotify's AI DJ feature?",
  },
  {
    id: "data-science",
    title: "Data Science & ML",
    icon: Database,
    color: "from-amber-500 to-orange-500",
    badge: "AI / Data",
    topics: ["ML Model Design", "SQL & ETL Pipelines", "A/B Testing & Statistics", "Feature Engineering"],
    questionPreview: "Explain how you would handle severe class imbalance in a fraud detection model.",
  },
  {
    id: "behavioral",
    title: "Behavioral & Leadership",
    icon: UserCheck,
    color: "from-pink-500 to-rose-500",
    badge: "All Levels",
    topics: ["STAR Method Delivery", "Conflict Resolution", "Project Failure Stories", "Cross-Functional Impact"],
    questionPreview: "Tell me about a time you had a major disagreement with your tech lead.",
  },
];

export default function RoleSelectorSection() {
  const [activeRole, setActiveRole] = useState(ROLES[0]);

  return (
    <section className="landing-section py-28 relative z-10">
      <div className="landing-container">
        
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">
            28+ Specialized Tracks
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Train for your exact role and seniority
          </h2>
          <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-[#CBD5E1]">
            Select your target career track below to see tailored interview questions, adaptive prompts, and rubric standards.
          </p>
        </div>

        {/* Interactive Track Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          
          {/* Role Tabs Left (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = activeRole.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role)}
                  className={`w-full flex items-center justify-between rounded-2xl p-5 text-left transition-all duration-200 border ${
                    isSelected
                      ? "border-blue-500/50 bg-[#0F1222] shadow-[0_10px_30px_rgba(37,99,235,0.2)]"
                      : "border-white/10 bg-[#0B0D18]/60 hover:border-white/20 hover:bg-[#0B0D18]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${role.color} text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-base font-bold text-white">{role.title}</span>
                      <span className="block text-xs text-[#CBD5E1] mt-0.5">{role.badge}</span>
                    </div>
                  </div>
                  <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? "text-blue-400 translate-x-1" : "text-[#CBD5E1]"}`} />
                </button>
              );
            })}
          </div>

          {/* Active Track Preview Canvas Right (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-white/15 bg-[#0B0D18]/80 p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${activeRole.color} text-white shadow-md`}>
                  <activeRole.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{activeRole.title} Track</h3>
                  <span className="text-xs text-blue-400 font-medium">{activeRole.badge}</span>
                </div>
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700"
              >
                Start Track <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Topics covered */}
            <div className="mt-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#CBD5E1]">Core Evaluated Skills</span>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeRole.topics.map((topic) => (
                  <div key={topic} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3 border border-white/5 text-xs text-[#CBD5E1]">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    {topic}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Question Preview */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#06070E] p-5">
              <div className="flex items-center justify-between text-xs text-[#CBD5E1] mb-2">
                <span className="font-mono text-blue-400 text-[0.7rem]">Sample AI Interview Prompt</span>
                <span className="text-[0.65rem] text-emerald-400">Adaptive Probe Active</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-white">
                &ldquo;{activeRole.questionPreview}&rdquo;
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
