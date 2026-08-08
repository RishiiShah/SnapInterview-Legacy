"use client";

import { CheckCircle2, Sliders, Video, Award } from "lucide-react";
import { LandingClipReveal, LandingFadeOnly, LandingScaleIn } from "./LandingMotion";

const STEPS = [
  {
    step: "01",
    title: "Prepare",
    badge: "2-Min Setup",
    subtitle: "Role, resume & job description",
    desc: "Select your target role and level. Optionally paste a job description or upload your resume so questions match the exact job.",
    details: [
      "Choose your role, seniority, and interview type",
      "Add a job description or resume for tailored questions",
      "Set difficulty and focus areas before starting",
    ],
    accent: "text-sky-400",
    dot: "bg-sky-400",
    icon: Sliders,
  },
  {
    step: "02",
    title: "Perform",
    badge: "Adaptive AI",
    subtitle: "Voice, video & coding",
    desc: "Answer prompts out loud on camera. The AI interviewer listens to your answers and asks realistic follow-up questions.",
    details: [
      "Speak naturally with your mic and camera on",
      "Get probed on vague logic or trade-offs in real time",
      "Solve coding challenges directly in the browser",
    ],
    accent: "text-violet-400",
    dot: "bg-violet-400",
    icon: Video,
  },
  {
    step: "03",
    title: "Perfect",
    badge: "Review & Improve",
    subtitle: "Replay, transcript & feedback",
    desc: "Rewatch your recording, search your transcript, and check your rubric scores so you know exactly what to improve.",
    details: [
      "Rewatch video to review pacing and delivery",
      "Search your transcript to refine weak answers",
      "Check rubric scores and targeted coaching tips",
    ],
    accent: "text-emerald-400",
    dot: "bg-emerald-400",
    icon: Award,
  },
] as const;

const DELIVERABLES = [
  ["HD Video Replay", "Full video recording you can scrub through"],
  ["Word Transcript", "Searchable speech-to-text transcript"],
  ["Rubric Scoring", "Clear evaluation across key skills"],
  ["Actionable Feedback", "Specific suggestions to improve next time"],
] as const;

export default function SocialProofSection() {
  return (
    <section id="how-it-works" className="landing-section relative z-10 bg-[#090A0F] py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="mb-8 border-t border-white/[0.08] pt-5 space-y-2.5 text-center">
          <LandingFadeOnly triggerOnView>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              The Practice Loop
            </span>
          </LandingFadeOnly>
          <LandingFadeOnly triggerOnView delay={0.07}>
            <h2 className="font-serif text-3xl leading-tight tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
              Three steps to interview mastery.
            </h2>
          </LandingFadeOnly>
          <LandingFadeOnly triggerOnView delay={0.16} className="mx-auto max-w-2xl">
            <p className="text-sm leading-relaxed text-[#CBD5E1]">
              Set up your context, practice live on mic and video, then review your recording and transcript to improve.
            </p>
          </LandingFadeOnly>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <LandingClipReveal
                key={item.step}
                triggerOnView
                mode="bottomUp"
                delay={0.14 * index}
                duration={1.1}
              >
                <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0F1A] p-5 sm:p-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-[#CBD5E1] bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-md">
                        STEP {item.step}
                      </span>
                      <span className={`text-[0.7rem] font-semibold uppercase tracking-wider ${item.accent}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${item.accent}`} aria-hidden="true" />
                      <h3 className="font-serif text-2xl font-normal leading-snug tracking-tight text-white">
                        {item.title}
                      </h3>
                    </div>

                    <p className="text-xs font-medium text-[#A8B6C8] mb-2.5">
                      {item.subtitle}
                    </p>

                    <p className="text-sm leading-relaxed text-[#CBD5E1]">
                      {item.desc}
                    </p>

                    <ul className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-3.5">
                      {item.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2.5">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`}
                            aria-hidden="true"
                          />
                          <span className="text-[0.8125rem] leading-relaxed text-[#CBD5E1]">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </LandingClipReveal>
            );
          })}
        </div>

        <LandingScaleIn
          triggerOnView
          delay={0.16}
          scaleFrom={0.98}
          className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0C0F1A] p-5 sm:p-6"
        >
          <p className="mb-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#B8C0CE]">
            What you get after every session
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DELIVERABLES.map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-xs font-semibold text-white">{title}</span>
                  <span className="mt-0.5 block text-[0.72rem] leading-relaxed text-[#CBD5E1]">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </LandingScaleIn>

      </div>
    </section>
  );
}
