import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

const CHART_SKELETON_HEIGHTS = [45, 72, 38, 60, 55, 80, 42];

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-4 pb-8">
      <SlideIn>
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
            Syncing Your Interview Signal
          </div>
          <p className="max-w-xl text-sm text-zinc-500">
            Pulling your latest practice streak, score trends, and recent feedback notes.
          </p>
        </div>
      </SlideIn>

      <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <FadeInStaggerItem key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
              <div className="h-5 w-5 animate-pulse rounded bg-sky-100" />
            </div>
            <div className="mt-4 h-8 w-16 animate-pulse rounded-lg bg-zinc-200" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-zinc-50" />
          </FadeInStaggerItem>
        ))}
      </FadeInStagger>

      <SlideIn delay={0.08}>
        <div className="mt-4 flex flex-wrap gap-3 py-1">
          <div className="h-10 w-44 animate-pulse rounded-xl bg-sky-100" />
          <div className="h-10 w-44 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </SlideIn>

      <FadeIn delay={0.14} direction="up">
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2">
            <div className="mb-6 h-5 w-32 animate-pulse rounded bg-zinc-100" />
            <div className="flex h-48 items-end justify-between gap-2">
              {CHART_SKELETON_HEIGHTS.map((height, i) => (
                <div key={i} className="w-full animate-pulse rounded-t-sm bg-sky-100" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white lg:col-span-3">
            <div className="border-b border-zinc-100 px-6 py-5">
              <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
            </div>
            <div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-100" />
                    <div className="space-y-2">
                      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                      <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
                    </div>
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
