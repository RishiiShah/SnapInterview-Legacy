import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

export default function AnalyticsLoading() {
  return (
    <div className="w-full space-y-10 pb-8">
      <SlideIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-3">
            <div className="h-7 w-36 animate-pulse rounded bg-white/[0.06]" />
            <p className="max-w-xl text-sm text-[#A8B0C2]">
              Building a quick view of your strongest responses, repeated misses, and momentum over time.
            </p>
          </div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-white/[0.04]" />
        </div>
      </SlideIn>

      <FadeInStagger triggerOnView={false}>
        <dl className="grid gap-x-8 gap-y-5 border-b border-white/[0.06] pb-6 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <FadeInStaggerItem key={i}>
              <div className="mb-2 h-3 w-20 animate-pulse rounded bg-white/[0.05]" />
              <div className="mb-2 h-8 w-16 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-3 w-28 animate-pulse rounded bg-white/[0.04]" />
            </FadeInStaggerItem>
          ))}
        </dl>
      </FadeInStagger>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08} direction="up">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-48 w-full animate-pulse rounded-lg bg-white/[0.03]" />
        </FadeIn>
        <FadeIn delay={0.12} direction="up">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="space-y-4">
            {[...Array(4)].map((_, j) => (
              <div key={j}>
                <div className="mb-1.5 flex justify-between">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.05]" />
                  <div className="h-3.5 w-12 animate-pulse rounded bg-white/[0.05]" />
                </div>
                <div className="h-1.5 w-full animate-pulse rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </FadeIn>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <FadeIn delay={0.16} direction="up">
          <div className="mb-2 h-5 w-28 animate-pulse rounded bg-white/[0.06]" />
          <div className="mb-5 h-3 w-44 animate-pulse rounded bg-white/[0.04]" />
          <div className="space-y-2.5">
            {[...Array(3)].map((_, j) => (
              <div key={`s-${j}`} className="h-12 w-full animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.2} direction="up">
          <div className="mb-2 h-5 w-36 animate-pulse rounded bg-white/[0.06]" />
          <div className="mb-5 h-3 w-44 animate-pulse rounded bg-white/[0.04]" />
          <div className="space-y-2.5">
            {[...Array(3)].map((_, j) => (
              <div key={`w-${j}`} className="h-12 w-full animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
