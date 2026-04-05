import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

export default function AnalyticsLoading() {
  return (
    <div className="w-full space-y-7">
      <SlideIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Reading Your Interview Patterns
            </div>
            <p className="max-w-xl text-sm text-zinc-500">
              Building a quick view of your strongest responses, repeated misses, and momentum over time.
            </p>
          </div>
          <div className="h-10 w-40 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </SlideIn>

      <FadeInStagger triggerOnView={false} className="grid gap-3.5 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <FadeInStaggerItem key={i} className="rounded-2xl border border-zinc-200 bg-white p-4.5">
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="mb-2 h-8 w-16 animate-pulse rounded-lg bg-zinc-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-50" />
          </FadeInStaggerItem>
        ))}
      </FadeInStagger>

      <div className="grid gap-4.5 lg:grid-cols-2">
        <FadeIn delay={0.08} direction="up" className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-6 h-5 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-48 w-full animate-pulse rounded bg-sky-50" />
        </FadeIn>
        <FadeIn delay={0.12} direction="up" className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-6 h-5 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-48 w-full animate-pulse rounded bg-sky-50" />
        </FadeIn>
      </div>

      <div className="grid gap-6 pb-8 lg:grid-cols-2">
        <FadeIn delay={0.16} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-2 h-5 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="mb-5 h-3 w-48 animate-pulse rounded bg-zinc-100" />
          <div className="space-y-2.5">
            {[...Array(3)].map((_, j) => (
              <div key={`s-${j}`} className="h-12 w-full animate-pulse rounded-lg bg-zinc-50" />
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.2} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-2 h-5 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="mb-5 h-3 w-48 animate-pulse rounded bg-zinc-100" />
          <div className="space-y-2.5">
            {[...Array(3)].map((_, j) => (
              <div key={`w-${j}`} className="h-12 w-full animate-pulse rounded-lg bg-zinc-50" />
            ))}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
