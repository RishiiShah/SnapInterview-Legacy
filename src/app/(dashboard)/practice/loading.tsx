import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function PracticeLoading() {
  return (
    <div className="w-full space-y-8 pb-8">
      <SlideIn>
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
            Setting Up Your Next Mock
          </div>
          <p className="max-w-xl text-sm text-zinc-500">
            Loading your practice presets, saved preferences, and recent interview context.
          </p>
        </div>
      </SlideIn>

      <div className="grid gap-8 lg:grid-cols-3">
        <FadeIn delay={0.08} direction="up" className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-6 h-6 w-40 animate-pulse rounded-lg bg-zinc-200" />

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {["w-24", "w-20"].map((widthClass, i) => (
                  <div key={i} className="space-y-2">
                    <div className={`h-4 ${widthClass} animate-pulse rounded bg-zinc-100`} />
                    <div className="h-10 w-full animate-pulse rounded-lg border border-zinc-100 bg-zinc-50" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
                    <div className="h-10 w-full animate-pulse rounded-lg border border-zinc-100 bg-zinc-50" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                <div className="h-32 w-full animate-pulse rounded-lg border border-zinc-100 bg-zinc-50" />
              </div>
            </div>

            <div className="mt-8 h-12 w-full animate-pulse rounded-xl bg-sky-100" />
          </div>
        </FadeIn>

        <FadeIn delay={0.12} direction="up" className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="divide-y divide-zinc-50">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2 px-5 py-4">
                  <div className="flex justify-between">
                    <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />
                    <div className="h-4 w-12 animate-pulse rounded bg-zinc-100" />
                  </div>
                  <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
                  <div className="mt-1 h-5 w-20 animate-pulse rounded-full bg-zinc-50" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 h-5 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="mt-1 h-2 w-2 animate-pulse rounded-full bg-sky-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
