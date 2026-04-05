import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion";

const steps = [
  {
    step: "01",
    title: "Choose The Interview You Need",
    desc: "Set the role, company context, interview type, and difficulty so the session starts in the right place.",
  },
  {
    step: "02",
    title: "Run The Mock",
    desc: "Answer out loud, handle follow-ups, and feel the pressure of a conversation instead of a static question list.",
  },
  {
    step: "03",
    title: "Review What Actually Happened",
    desc: "Open the recording, inspect the transcript, and use the scorecard to tighten your next rep immediately.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-y border-sky-100/80 bg-[linear-gradient(180deg,#f7fbff_0%,#fdfefe_100%)] px-6 py-22 md:px-12">
      <div className="mx-auto max-w-7xl">
        <FadeIn direction="up">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
            The Flow
          </p>
          <h2 className="mx-auto max-w-3xl text-center text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight">
            Move from setup to sharper answers in one clean loop
          </h2>
        </FadeIn>

        <FadeInStagger className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((item) => (
            <FadeInStaggerItem key={item.step} className="group relative rounded-[1.6rem] border border-sky-100/80 bg-white/88 p-7 shadow-[0_24px_54px_-48px_rgba(15,109,252,0.5)]">
              <span className="mb-4 block text-5xl font-bold text-sky-200 transition-colors group-hover:text-sky-500">
                {item.step}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-zinc-950">{item.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">
                {item.desc}
              </p>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
