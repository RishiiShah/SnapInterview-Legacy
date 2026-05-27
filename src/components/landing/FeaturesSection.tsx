import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion";
import {
  AnimatedChartBarsIcon,
  AnimatedClockIcon,
  AnimatedQuestionBankIcon,
  AnimatedSparklesIcon,
  AnimatedTrendingUpIcon,
  AnimatedVideoCameraIcon,
} from "@/components/ui/animated-icons";

const features = [
  {
    icon: <AnimatedSparklesIcon className="h-5 w-5" strokeWidth={1.5} />,
    title: "Live Follow-Ups",
    desc: "The interviewer pushes on weak spots instead of stopping at canned one-shot prompts.",
  },
  {
    icon: <AnimatedChartBarsIcon className="h-5 w-5" strokeWidth={1.5} />,
    title: "Useful Scorecards",
    desc: "See where you rambled, where you lacked depth, and where your answer actually landed.",
  },
  {
    icon: <AnimatedQuestionBankIcon className="h-5 w-5" strokeWidth={1.5} />,
    title: "Targeted Question Sets",
    desc: "Practice by role, company style, and interview type instead of digging through random prompts.",
  },
  {
    icon: <AnimatedVideoCameraIcon className="h-5 w-5" strokeWidth={1.5} />,
    title: "Replay The Session",
    desc: "Review the exact answer you gave, not the polished version you remember afterward.",
  },
  {
    icon: <AnimatedTrendingUpIcon className="h-5 w-5" strokeWidth={1.5} />,
    title: "Track Real Improvement",
    desc: "Watch your pacing, clarity, and confidence change across repeated reps over time.",
  },
  {
    icon: <AnimatedClockIcon className="h-5 w-5" strokeWidth={1.5} />,
    title: "Always Ready",
    desc: "Run a quick rep before work, a full mock at night, or a last-minute warmup before the interview.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-22 md:px-12">
      <div className="mx-auto max-w-7xl">
        <FadeIn direction="up">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
            Why It Feels Sharper
          </p>
          <h2 className="mx-auto max-w-3xl text-center text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight">
            Less fake practice, more signal you can actually use
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[clamp(1rem,1.5vw,1.125rem)] leading-relaxed text-zinc-500">
            Every session is built to help you hear better questions, give stronger answers, and see exactly where your interview performance breaks down.
          </p>
        </FadeIn>

        <FadeInStagger className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FadeInStaggerItem key={feature.title}>
              <div className="group h-full rounded-[1.6rem] border border-sky-100/80 bg-white/88 p-7 shadow-[0_28px_60px_-52px_rgba(15,109,252,0.55)] transition-all hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_30px_70px_-48px_rgba(15,109,252,0.7)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-[linear-gradient(135deg,#19a7ff,#0f6dfc)] group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-zinc-950">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {feature.desc}
                </p>
              </div>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
