import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function RecordingsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 pt-2 xl:max-w-[88rem]">
      <SlideIn>
        <div className="space-y-3">
          <div className="h-9 w-44 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/[0.04]" />
        </div>
      </SlideIn>

      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex flex-wrap gap-4">
          {[36, 56, 48, 64, 40].map((w, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-white/[0.05]" style={{ width: w }} />
          ))}
        </div>
        <div className="h-4 w-28 animate-pulse rounded bg-white/[0.04]" />
      </div>

      <div className="divide-y divide-white/[0.05]">
        {[...Array(6)].map((_, i) => (
          <FadeIn key={i} delay={i * 0.03} direction="up" className="flex items-center gap-4 py-3.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-white/[0.05]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 max-w-[55%] animate-pulse rounded bg-white/[0.07]" />
              <div className="h-3 w-56 max-w-[70%] animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="hidden h-3 w-14 animate-pulse rounded bg-white/[0.04] sm:block" />
            <div className="h-5 w-8 animate-pulse rounded bg-white/[0.06]" />
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
