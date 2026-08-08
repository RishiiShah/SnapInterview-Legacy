import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-11 pb-16 pt-2 xl:max-w-[88rem]">
      <SlideIn>
        <div className="space-y-3">
          <div className="h-9 w-44 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/[0.04]" />
        </div>
      </SlideIn>

      <FadeIn triggerOnView={false} direction="up">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 h-3 w-24 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-14 w-28 animate-pulse rounded bg-white/[0.08]" />
          </div>
          <FadeInStagger triggerOnView={false}>
            <dl className="grid grid-cols-3 gap-x-8 gap-y-5">
              {[...Array(3)].map((_, i) => (
                <FadeInStaggerItem key={i}>
                  <div className="mb-2 h-3 w-16 animate-pulse rounded bg-white/[0.05]" />
                  <div className="h-7 w-12 animate-pulse rounded bg-white/[0.07]" />
                </FadeInStaggerItem>
              ))}
            </dl>
          </FadeInStagger>
        </div>
      </FadeIn>

      <div className="grid gap-10 border-t border-white/[0.06] pt-10 lg:grid-cols-2">
        <FadeIn delay={0.08} direction="up">
          <div className="mb-5 h-6 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-40 w-full animate-pulse rounded bg-white/[0.03]" />
        </FadeIn>
        <FadeIn delay={0.12} direction="up">
          <div className="mb-5 h-6 w-32 animate-pulse rounded bg-white/[0.06]" />
          <div className="space-y-5">
            {[...Array(4)].map((_, j) => (
              <div key={j}>
                <div className="mb-2 flex justify-between">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.05]" />
                  <div className="h-3.5 w-8 animate-pulse rounded bg-white/[0.05]" />
                </div>
                <div className="h-px w-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
