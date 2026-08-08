export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-xl border border-white/[0.08] bg-[#12141A]"
          />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-white/[0.08] bg-[#12141A]" />
    </div>
  );
}
