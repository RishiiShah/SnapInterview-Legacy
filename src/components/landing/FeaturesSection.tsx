import { MessageCircle, Video, ListChecks } from "lucide-react";
import { LandingFadeIn, LandingFadeInStagger, LandingFadeInStaggerItem } from "./LandingMotion";

const glassBg = {
  background:
    "linear-gradient(145deg, rgba(40,58,95,0.45) 0%, rgba(20,33,61,0.55) 55%, rgba(12,20,40,0.7) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px rgba(56,189,248,0.08), 0 16px 40px rgba(0,40,130,0.12)",
};

const features = [
  {
    icon: <MessageCircle className="h-7 w-7 text-[#A78BFA]" />,
    title: "Adaptive AI interviewer",
    desc: "Role-specific prompts and follow-up questions that respond to what you actually said — not a fixed script.",
    footer: (
      <>
        <div className="flex flex-1 flex-col items-center border-r border-white/10">
          <span className="text-sm font-bold text-[#F5F7FF]">Roles</span>
          <span className="text-xs text-[#657086]">28+</span>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-sm font-bold text-[#F5F7FF]">Follow-ups</span>
          <span className="text-xs text-[#657086]">Adaptive</span>
        </div>
      </>
    ),
  },
  {
    icon: <Video className="h-7 w-7 text-[#38BDF8]" />,
    title: "Video replay & transcript",
    desc: "Record your answers, then review how you sounded and looked on camera next to the full transcript.",
    footer: (
      <>
        <div className="flex flex-1 flex-col items-center border-r border-white/10">
          <span className="text-sm font-bold text-[#F5F7FF]">Video</span>
          <span className="text-xs text-[#657086]">Replay</span>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-sm font-bold text-[#F5F7FF]">Transcript</span>
          <span className="text-xs text-[#657086]">Saved</span>
        </div>
      </>
    ),
  },
  {
    icon: <ListChecks className="h-7 w-7 text-[#818CF8]" />,
    title: "Scoring & focused practice",
    desc: "Get automated evaluation after a mock, or drill individual questions by type and difficulty.",
    footer: (
      <>
        <div className="flex flex-1 flex-col items-center border-r border-white/10">
          <span className="text-sm font-bold text-[#F5F7FF]">Scores</span>
          <span className="text-xs text-[#657086]">Auto</span>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-sm font-bold text-[#F5F7FF]">Questions</span>
          <span className="text-xs text-[#657086]">Practice</span>
        </div>
      </>
    ),
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="landing-section relative">
      <LandingFadeIn triggerOnView data-landing-reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[#F5F7FF] sm:text-4xl">
          Built for interview prep
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-[#8E97AB] sm:text-base">
          Everything centers on realistic practice: speaking out loud, getting follow-ups, and reviewing
          how you actually performed.
        </p>
      </LandingFadeIn>

      <LandingFadeInStagger
        triggerOnView
        data-landing-reveal
        className="landing-container mt-[clamp(2.5rem,5vw,3.5rem)] grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature) => (
          <LandingFadeInStaggerItem
            key={feature.title}
            data-landing-reveal
            className="group relative flex min-h-[15rem] flex-col rounded-2xl border border-white/15 px-5 py-6 text-center transition-[border-color,box-shadow] duration-300 hover:border-violet-300/30 hover:shadow-[0_0_28px_rgba(99,102,241,0.12)] sm:px-6"
            style={glassBg}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[rgba(20,33,61,0.7)] transition-transform duration-300 group-hover:-translate-y-1">
              {feature.icon}
            </div>
            <h3 className="text-lg font-bold text-[#F5F7FF] sm:text-xl">{feature.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#8E97AB]">{feature.desc}</p>
            <div className="mt-auto flex rounded-xl border border-white/10 bg-[rgba(10,18,36,0.55)] py-3">
              {feature.footer}
            </div>
          </LandingFadeInStaggerItem>
        ))}
      </LandingFadeInStagger>
    </section>
  );
}
