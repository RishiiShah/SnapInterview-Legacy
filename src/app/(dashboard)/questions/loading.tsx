import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function QuestionsLoading() {
  return (
    <div className="w-full space-y-6 pb-8">
      <SlideIn>
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/[0.04]" />
        </div>
      </SlideIn>

      <FadeIn delay={0.06} direction="up">
        <div className="flex flex-wrap items-center gap-3 px-[1%]">
          <div className="h-10 min-w-[200px] flex-1 animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03]" />
          <div className="h-10 w-36 animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03]" />
          <div className="h-10 w-24 animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03]" />
        </div>
      </FadeIn>

      <FadeIn delay={0.1} direction="up">
        <div className="h-3.5 w-44 animate-pulse rounded bg-white/[0.04]" />
      </FadeIn>

      <FadeIn delay={0.14} direction="up">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex gap-4 border-b border-white/[0.06] bg-white/[0.03] px-6 py-3">
            <div className="h-4 w-4 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-4 flex-1 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-4 w-24 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/[0.05]" />
          </div>
          <div className="divide-y divide-white/[0.06]">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-5 animate-pulse rounded bg-white/[0.05]" />
                <div className="h-4 flex-1 animate-pulse rounded bg-white/[0.05]" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-white/[0.04]" />
                <div className="h-4 w-16 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-4 w-12 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
