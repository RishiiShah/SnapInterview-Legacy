export default function AdminInterviewsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-zinc-200" />
        <div className="h-4 w-80 rounded bg-zinc-100" />
      </div>
      <div className="h-28 rounded-xl border border-zinc-200 bg-white" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-xl border border-zinc-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
