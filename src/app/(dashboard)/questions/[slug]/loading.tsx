export default function QuestionDetailLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 animate-pulse bg-transparent p-2">
      <div className="flex h-11 shrink-0 items-center justify-between rounded-xl border border-white/[0.08] bg-[#12141A]/90 px-4">
        <div className="h-3.5 w-24 rounded bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/[0.05]" />
          <div className="h-3 w-12 rounded bg-white/[0.08]" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.05]" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex w-[42%] min-w-[280px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90">
          <div className="flex h-10 items-center gap-2 border-b border-white/[0.06] px-3">
            <div className="h-3 w-20 rounded bg-white/[0.08]" />
            <div className="h-3 w-16 rounded bg-white/[0.05]" />
          </div>
          <div className="space-y-4 p-5">
            <div className="h-6 w-3/4 rounded bg-white/[0.08]" />
            <div className="flex gap-2">
              <div className="h-6 w-14 rounded-full bg-white/[0.06]" />
              <div className="h-6 w-16 rounded-full bg-white/[0.05]" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-white/[0.05]" />
              <div className="h-3 w-full rounded bg-white/[0.05]" />
              <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-[1.35] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90">
            <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
              <div className="h-3 w-20 rounded bg-white/[0.08]" />
              <div className="h-3 w-12 rounded bg-white/[0.05]" />
            </div>
            <div className="flex-1 bg-white/[0.02]" />
          </div>
          <div className="flex h-[min(38%,22rem)] min-h-[11rem] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90">
            <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
              <div className="h-3 w-24 rounded bg-white/[0.08]" />
              <div className="flex gap-2">
                <div className="h-7 w-14 rounded-md bg-white/[0.06]" />
                <div className="h-7 w-16 rounded-md bg-emerald-500/20" />
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="h-7 w-20 rounded-lg bg-white/[0.06]" />
              <div className="h-10 w-full rounded-lg bg-[#0B0C10]" />
              <div className="h-10 w-full rounded-lg bg-[#0B0C10]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
