import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-11 pb-16 pt-2 xl:max-w-6xl">
      <SlideIn>
        <header className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3.5">
            <div className="h-[4.5rem] w-[3.15rem] animate-pulse rounded-md bg-white/[0.06] sm:h-[5.25rem] sm:w-[3.6rem]" />
            <div className="h-[4.5rem] w-[3.15rem] animate-pulse rounded-md bg-white/[0.06] sm:h-[5.25rem] sm:w-[3.6rem]" />
            <div className="space-y-2 pb-1">
              <div className="h-5 w-14 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
          <div className="space-y-3 sm:max-w-md sm:text-right">
            <div className="ml-auto h-9 w-64 max-w-full animate-pulse rounded bg-white/[0.08]" />
            <div className="ml-auto h-4 w-80 max-w-full animate-pulse rounded bg-white/[0.04]" />
            <div className="flex gap-3 sm:justify-end">
              <div className="h-11 w-44 animate-pulse rounded-lg bg-[#3B82F6]/30" />
              <div className="h-11 w-32 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          </div>
        </header>
      </SlideIn>

      <FadeIn direction="up">
        <section className="py-1">
          <div className="flex flex-col gap-7 lg:flex-row lg:justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-14 w-28 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-4 w-48 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-14 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-6 w-10 animate-pulse rounded bg-white/[0.07]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.06} direction="up">
        <div className="space-y-3.5">
          <div className="h-7 w-40 animate-pulse rounded bg-white/[0.07]" />
          <div className="divide-y divide-white/[0.05]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-10 flex-1 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-6 w-8 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
