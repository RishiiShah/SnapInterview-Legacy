import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/motion";

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-zinc-50 py-24 px-6 md:px-12 border-y border-zinc-100">
      <div className="mx-auto max-w-7xl">
        <FadeIn direction="up">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
            How It Works
          </p>
          <h2 className="mx-auto max-w-3xl text-center text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight">
            Three steps to interview confidence
          </h2>
        </FadeIn>

        <FadeInStagger className="mt-16 grid gap-10 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Pick Your Role",
              desc: "Choose from hundreds of job roles and difficulty levels. We tailor every session to your target position.",
            },
            {
              step: "02",
              title: "Practice with AI",
              desc: "Jump into a realistic mock interview. Our AI asks questions, listens, and responds — just like a real panel.",
            },
            {
              step: "03",
              title: "Review & Improve",
              desc: "Get an instant scorecard with actionable tips. Track your scores over time and watch yourself improve.",
            },
          ].map((s) => (
            <FadeInStaggerItem key={s.step} className="relative group">
              <span className="mb-4 block text-5xl font-extrabold text-zinc-300 transition-colors group-hover:text-zinc-900">
                {s.step}
              </span>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">
                {s.desc}
              </p>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
