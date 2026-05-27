import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

export default async function AdminInterviewsPage() {
  async function softDeleteInterviewAction(formData: FormData) {
    "use server";
    await requireAdminSession();

    const id = String(formData.get("interviewId") ?? "");
    if (!id) return;

    await prisma.interviewSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/admin/interviews");
  }

  async function restoreInterviewAction(formData: FormData) {
    "use server";
    await requireAdminSession();

    const id = String(formData.get("interviewId") ?? "");
    if (!id) return;

    await prisma.interviewSession.update({
      where: { id },
      data: { deletedAt: null },
    });

    revalidatePath("/admin/interviews");
  }

  const [statusCounts, activeCount, deletedCount, recentInterviews] = await Promise.all([
    prisma.interviewSession.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { status: "desc" } },
    }),
    prisma.interviewSession.count({ where: { deletedAt: null } }),
    prisma.interviewSession.count({ where: { deletedAt: { not: null } } }),
    prisma.interviewSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        role: true,
        type: true,
        difficulty: true,
        status: true,
        createdAt: true,
        deletedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        transcript: { select: { id: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Interviews</h2>
        <p className="mt-1 text-sm text-zinc-500">Recent interview sessions and completion state.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Active Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{activeCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Soft Deleted</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{deletedCount.toLocaleString()}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {statusCounts.map((status) => (
          <div key={status.status} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{status.status}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{status._count._all.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Record State</th>
              <th className="px-4 py-3">Transcript Entries</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentInterviews.map((session) => (
              <tr key={session.id} className="border-b border-zinc-100 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{session.user.name}</p>
                  <p className="text-xs text-zinc-500">{session.user.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-700">{session.role}</td>
                <td className="px-4 py-3 text-zinc-700">{session.type}</td>
                <td className="px-4 py-3 text-zinc-700">{session.difficulty}</td>
                <td className="px-4 py-3 text-zinc-700">{session.status}</td>
                <td className="px-4 py-3 text-zinc-700">{session.deletedAt ? "Soft Deleted" : "Active"}</td>
                <td className="px-4 py-3 text-zinc-700">{session.transcript.length}</td>
                <td className="px-4 py-3 text-zinc-700">{formatDate(session.createdAt)}</td>
                <td className="px-4 py-3">
                  {session.deletedAt ? (
                    <form action={restoreInterviewAction}>
                      <input type="hidden" name="interviewId" value={session.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      >
                        Restore
                      </button>
                    </form>
                  ) : (
                    <form action={softDeleteInterviewAction}>
                      <input type="hidden" name="interviewId" value={session.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Soft Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
