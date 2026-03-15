import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion";
import {
  IconChartBars,
  IconClock,
  IconQuestionBank,
  IconStarBurst,
  IconTrendingUp,
  IconVideoCamera,
} from "@/components/ui/icons";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn direction="up">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Features
          </p>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to prepare
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
            From AI mock interviews to detailed analytics — we give you the
            full toolkit to outperform the competition.
          </p>
        </FadeIn>

        <FadeInStagger className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <IconStarBurst className="h-5 w-5" />,
              title: "AI Interviewer",
              desc: "Our AI adapts in real time, asking follow-ups just like a real interviewer would.",
            },
            {
              icon: <IconChartBars className="h-5 w-5" />,
              title: "Instant Feedback",
              desc: "Get a detailed scorecard after every session — strengths, weak spots, and how to improve.",
            },
            {
              icon: <IconQuestionBank className="h-5 w-5" />,
              title: "Question Library",
              desc: "Thousands of curated questions across industries — behavioral, technical, and case study.",
            },
            {
              icon: <IconVideoCamera className="h-5 w-5" strokeWidth={1.5} />,
              title: "Video Recording",
              desc: "Record your sessions, replay them, and catch every detail you missed in the moment.",
            },
            {
              icon: <IconTrendingUp className="h-5 w-5" />,
              title: "Progress Tracking",
              desc: "Visualize your improvement over weeks with detailed analytics and performance charts.",
            },
            {
              icon: <IconClock className="h-5 w-5" />,
              title: "24 / 7 Access",
              desc: "Practice on your schedule — morning, night, or five minutes before the real thing.",
            },
          ].map((f) => (
            <FadeInStaggerItem key={f.title}>
              <div className="group h-full rounded-2xl border border-zinc-100 bg-white p-7 transition-all hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-100 hover:-translate-y-1">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </div>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
