export default function AdminInterviewsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-80 rounded bg-white/[0.04]" />
      </div>
      <div className="h-28 rounded-xl border border-white/[0.08] bg-[#12141A]" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-16 rounded-xl border border-white/[0.08] bg-[#12141A]"
          />
        ))}
      </div>
    </div>
  );
}
