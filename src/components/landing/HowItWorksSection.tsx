import { ListChecks, Settings2, Video } from "lucide-react";
import { LandingFadeIn, LandingFadeInStagger, LandingFadeInStaggerItem } from "./LandingMotion";

const steps = [
  {
    step: "01",
    icon: Settings2,
    iconColor: "text-[#A78BFA]",
    title: "Set up your interview",
    desc: "Pick a role, interview type, and difficulty. Optionally add your resume and a job description so questions feel specific to the opportunity.",
  },
  {
    step: "02",
    icon: Video,
    iconColor: "text-[#67E8F9]",
    title: "Practice out loud on video",
    desc: "Answer with your mic and camera in a live session. The AI interviewer can follow up based on what you said.",
  },
  {
    step: "03",
    icon: ListChecks,
    iconColor: "text-[#818CF8]",
    title: "Review and improve",
    desc: "Watch the recording, read the transcript, and use automated scoring to see what to tighten before the real interview.",
  },
];

export default function SocialProofSection() {
  return (
    <section id="how-it-works" className="landing-section relative">
      <LandingFadeIn triggerOnView data-landing-reveal className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-[#A78BFA]">How it works</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#F5F7FF] sm:text-4xl">
          From setup to review in one loop
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-[#8E97AB] sm:text-base">
          A simple path designed for candidates who want repeatable practice — not another static question list.
        </p>
      </LandingFadeIn>

      <LandingFadeInStagger
        triggerOnView
        data-landing-reveal
        className="landing-container relative mt-[clamp(2.5rem,5vw,3.5rem)] grid gap-6 md:grid-cols-3"
      >
        <div
          data-landing-connector
          aria-hidden="true"
          className="pointer-events-none absolute left-[16%] right-[16%] top-6 z-0 hidden h-px bg-gradient-to-r from-violet-400/0 via-violet-400/40 to-cyan-400/0 md:block"
        />
        {steps.map((item) => (
          <LandingFadeInStaggerItem
            key={item.step}
            data-landing-reveal
            data-landing-step-card
            className="group relative z-10 overflow-hidden rounded-2xl border border-white/15 bg-[#0F1B31]/90 px-5 py-6 backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-violet-300/35 hover:shadow-[0_18px_45px_rgba(56,189,248,0.12)]"
            style={{
              background: "linear-gradient(145deg, rgba(35, 53, 90, 0.88), rgba(10, 18, 36, 0.94))",
              backdropFilter: "blur(18px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px rgba(0, 20, 70, 0.18)",
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div
                data-landing-step-icon
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(79,70,229,0.16)] transition-transform duration-300 group-hover:-translate-y-0.5"
              >
                <item.icon className={`size-5 ${item.iconColor}`} strokeWidth={1.8} />
              </div>
              <span className="text-sm font-bold tracking-wide text-[#818CF8]">{item.step}</span>
            </div>
            <h3 className="text-lg font-bold text-[#F5F7FF]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#8E97AB]">{item.desc}</p>
          </LandingFadeInStaggerItem>
        ))}
      </LandingFadeInStagger>
    </section>
  );
}
