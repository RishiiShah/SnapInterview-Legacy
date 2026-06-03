export default function AdminQuestionsNewLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-zinc-100" />
      </div>
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-100" />
            <div className="h-10 w-full rounded-xl bg-zinc-50" />
          </div>
        ))}
        <div className="h-10 w-36 rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}
