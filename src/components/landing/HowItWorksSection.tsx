import { CheckCircle2, Sliders, Video, Award } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Prepare",
    badge: "2-Min Setup",
    subtitle: "Role, difficulty & custom prompt scenario",
    desc: "Pick your target role and seniority. Optionally paste a job description or upload your resume to tailor questions to your exact target interview.",
    accent: "text-sky-400",
    icon: Sliders,
  },
  {
    step: "02",
    title: "Perform",
    badge: "Adaptive AI",
    subtitle: "Voice, video & in-browser code under pressure",
    desc: "Answer out loud with your mic and camera open. The AI interviewer probes your reasoning in real time based on what you actually say.",
    accent: "text-violet-400",
    icon: Video,
  },
  {
    step: "03",
    title: "Perfect",
    badge: "Instant Score",
    subtitle: "Video replay, searchable transcript & rubric",
    desc: "Review your automated rubric scores, watch your video recording playback, search your transcript, and iterate until you reach a strong pass.",
    accent: "text-emerald-400",
    icon: Award,
  },
];

export default function SocialProofSection() {
  return (
    <section id="how-it-works" className="landing-section relative z-10 bg-[#090A0F] py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="mb-8 border-t border-white/[0.08] pt-5 space-y-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            The Practice Loop
          </span>
          <h2 className="font-serif text-3xl leading-tight tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
            Three steps to interview mastery.
          </h2>
          <p className="text-sm leading-relaxed text-[#64748B]">
            A clear, repeatable loop designed to transform interview preparation into quiet confidence.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0F1A] p-5 sm:p-6"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#64748B] bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-md">
                      STEP {item.step}
                    </span>
                    <span className={`text-[0.7rem] font-semibold uppercase tracking-wider ${item.accent}`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${item.accent}`} />
                    <h3 className="font-serif text-2xl font-normal leading-snug tracking-tight text-white">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs font-medium text-[#8090A8] mb-2.5">
                    {item.subtitle}
                  </p>

                  <p className="text-sm leading-relaxed text-[#64748B]">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Deliverables Banner */}
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0C0F1A] p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["HD Video Replay", "Full session video recording"],
              ["Word Transcript", "Searchable speech-to-text"],
              ["Rubric Scoring", "Automated evaluation"],
              ["Actionable Fixes", "Coaching notes for next run"],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold text-white">{title}</span>
                  <span className="block text-[0.72rem] text-[#64748B]">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
