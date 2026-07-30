import { CheckCircle2, Sliders, Video, Award, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Prepare",
    subtitle: "Role, difficulty & custom prompt scenario",
    desc: "Pick your target role and level. Optionally paste the exact job description or resume to tailor questions to your dream role.",
    icon: Sliders,
    color: "from-blue-500 to-cyan-500",
    badge: "2-Min Setup",
  },
  {
    step: "02",
    title: "Perform",
    subtitle: "Voice, video & in-browser code under pressure",
    desc: "Answer out loud with your mic and camera open. The AI interviewer probes your reasoning in real time based on what you actually say.",
    icon: Video,
    color: "from-violet-500 to-indigo-500",
    badge: "Adaptive AI",
  },
  {
    step: "03",
    title: "Perfect",
    subtitle: "Video replay, searchable transcript & rubric",
    desc: "Uncover your rubric scores, watch your recording playback, search your transcript, and iterate until you reach a strong pass.",
    icon: Award,
    color: "from-emerald-500 to-teal-500",
    badge: "Instant Score",
  },
];

export default function SocialProofSection() {
  return (
    <section id="how-it-works" className="landing-section py-28 relative z-10">
      <div className="landing-container">

        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">
            03 / The Journey
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Three steps to interview mastery
          </h2>
          <p className="mt-3.5 max-w-xl text-base leading-relaxed text-[#94A3B8]">
            A clear, repeatable loop designed to transform interview anxiety into quiet confidence.
          </p>
        </div>

        {/* 3 Constellation Waypoint Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B0D18]/60 p-8 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:bg-[#0B0D18]/80"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-3xl font-black text-[#475569]">
                      {item.step}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold text-[#CBD5E1]">
                      {item.badge}
                    </span>
                  </div>

                  <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} p-3 text-white shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[#60A5FA]">
                    {item.subtitle}
                  </p>
                  <p className="mt-3.5 text-sm leading-relaxed text-[#94A3B8]">
                    {item.desc}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#090A0F] border border-white/15 text-[#64748B] shadow-md">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Inset Deliverables Banner */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 p-6 backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["HD Video Replay", "Full session video recording"],
              ["Word Transcript", "Searchable speech-to-text"],
              ["Rubric Scoring", "3-axis automated evaluation"],
              ["Actionable Fixes", "Coaching notes for next run"],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold text-white">{title}</span>
                  <span className="block text-[0.75rem] text-[#94A3B8]">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
