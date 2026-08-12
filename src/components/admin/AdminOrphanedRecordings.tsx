import { findOrphanedRecordingsForUser } from "@/lib/admin/orphaned-recordings";

export async function AdminOrphanedRecordings({ userId }: { userId: string }) {
  const orphanedRecordings = await findOrphanedRecordingsForUser(userId);

  if (orphanedRecordings.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
      <p className="text-sm font-medium text-amber-200">
        Orphaned storage objects for this user ({orphanedRecordings.length})
      </p>
      <p className="mt-1 text-xs text-amber-200/80">
        These `.webm` files exist in S3 but are not linked to any interview session.
      </p>
      <ul className="mt-3 space-y-1 font-mono text-xs text-amber-100/90">
        {orphanedRecordings.map((video) => (
          <li key={video.key} className="break-all">
            {video.key} · {(video.size / 1024).toFixed(1)} KB
          </li>
        ))}
      </ul>
    </div>
  );
}
