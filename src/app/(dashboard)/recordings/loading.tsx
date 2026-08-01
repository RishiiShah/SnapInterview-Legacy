import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function RecordingsLoading() {
  return (
    <div className="w-full space-y-8 pb-8">
      <SlideIn>
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/[0.04]" />
        </div>
      </SlideIn>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[56, 72, 88, 64, 80].map((w, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.03]"
              style={{ width: w }}
            />
          ))}
        </div>
        <div className="h-9 w-40 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      </div>

      <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {[...Array(6)].map((_, i) => (
          <FadeIn key={i} delay={i * 0.03} direction="up" className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-white/[0.05]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 max-w-[55%] animate-pulse rounded bg-white/[0.07]" />
              <div className="h-3 w-56 max-w-[70%] animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="hidden h-5 w-16 animate-pulse rounded-full bg-white/[0.05] sm:block" />
            <div className="h-5 w-8 animate-pulse rounded bg-white/[0.06]" />
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
