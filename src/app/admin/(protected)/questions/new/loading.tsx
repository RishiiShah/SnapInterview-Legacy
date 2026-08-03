export default function AdminQuestionsNewLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-72 rounded bg-white/[0.04]" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#12141A] p-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 rounded bg-white/[0.04]" />
            <div className="h-10 w-full rounded-xl bg-white/[0.03]" />
          </div>
        ))}
        <div className="h-10 w-36 rounded-lg bg-white/[0.06]" />
      </div>
    </div>
  );
}
