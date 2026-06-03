export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-zinc-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl border border-zinc-200 bg-white" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-zinc-200 bg-white" />
    </div>
  );
}
