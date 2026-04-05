import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function RecordingsLoading() {
  return (
    <div className="w-full space-y-8 pb-8">
      <SlideIn>
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
            Opening Your Practice Archive
          </div>
          <p className="max-w-xl text-sm text-zinc-500">
            Pulling your saved recordings so you can replay tough moments and review them fast.
          </p>
        </div>
      </SlideIn>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <FadeIn key={i} delay={i * 0.04} direction="up" className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="relative flex aspect-video items-center justify-center bg-sky-50">
              <div className="h-12 w-12 animate-pulse rounded-full bg-sky-100" />
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />
                <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-100" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
