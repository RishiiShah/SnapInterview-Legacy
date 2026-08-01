import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function QuestionsLoading() {
  return (
    <div className="w-full space-y-6 pb-8">
      <SlideIn>
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
            Loading Your Question Bank
          </div>
          <p className="max-w-xl text-sm text-zinc-600">
            Sorting the prompts, categories, and solved status for your next practice block.
          </p>
        </div>
      </SlideIn>

      <FadeIn delay={0.06} direction="up">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-zinc-100" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-100" />
              <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-100" />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 border-t border-zinc-100 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-32 animate-pulse rounded-lg border border-zinc-100 bg-zinc-50" />
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1} direction="up">
        <div className="h-4 w-44 animate-pulse rounded bg-zinc-100" />
      </FadeIn>

      <FadeIn delay={0.14} direction="up">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex gap-4 border-b border-zinc-200 bg-zinc-50/50 px-6 py-3">
            <div className="h-5 w-4 animate-pulse rounded bg-zinc-200" />
            <div className="h-5 flex-1 animate-pulse rounded bg-zinc-200" />
            <div className="h-5 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="h-5 w-20 animate-pulse rounded bg-zinc-200" />
            <div className="h-5 w-16 animate-pulse rounded bg-zinc-200" />
          </div>
          <div className="divide-y divide-zinc-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-5 w-5 animate-pulse rounded-full bg-sky-100" />
                <div className="h-5 flex-1 animate-pulse rounded bg-zinc-100" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-50" />
                <div className="h-5 w-16 animate-pulse rounded bg-zinc-100" />
                <div className="h-5 w-12 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
