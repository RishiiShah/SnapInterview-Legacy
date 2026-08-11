export default function PracticeLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl pb-20 pt-6 xl:max-w-5xl">
      <div className="mb-10 flex items-center gap-3">
        <div className="h-3 w-8 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <div className="space-y-4">
        <div className="h-10 w-80 max-w-full animate-pulse rounded bg-white/[0.07]" />
        <div className="h-4 w-56 max-w-full animate-pulse rounded bg-white/[0.04]" />
      </div>

      <div className="mt-12 space-y-8">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-10 w-full animate-pulse border-b border-white/[0.08] bg-transparent" />
          </div>
        ))}
      </div>

      <div className="mt-14 flex justify-end">
        <div className="h-11 w-28 animate-pulse rounded-lg bg-[#3B82F6]/30" />
      </div>
    </div>
  );
}
