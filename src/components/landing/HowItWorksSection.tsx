import { LandingFadeIn, LandingFadeInStagger, LandingFadeInStaggerItem } from "./LandingMotion";

const steps = [
  {
    step: "01",
    title: "Set up your interview",
    desc: "Pick a role, interview type, and difficulty. Optionally add your resume and a job description so questions feel specific to the opportunity.",
  },
  {
    step: "02",
    title: "Practice out loud on video",
    desc: "Answer with your mic and camera in a live session. The AI interviewer can follow up based on what you said.",
  },
  {
    step: "03",
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
          className="pointer-events-none absolute left-[16%] right-[16%] top-6 hidden h-px bg-gradient-to-r from-violet-400/0 via-violet-400/40 to-cyan-400/0 md:block"
        />
        {steps.map((item) => (
          <LandingFadeInStaggerItem
            key={item.step}
            data-landing-reveal
            className="relative z-10 rounded-2xl border border-white/15 px-5 py-6"
            style={{
              background: "rgba(20, 33, 61, 0.55)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-sm font-bold text-[#818CF8]">{item.step}</span>
            <h3 className="mt-3 text-lg font-bold text-[#F5F7FF]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#8E97AB]">{item.desc}</p>
          </LandingFadeInStaggerItem>
        ))}
      </LandingFadeInStagger>
    </section>
  );
}
