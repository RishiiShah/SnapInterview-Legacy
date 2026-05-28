import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ConfirmActionForm } from "@/components/admin/ConfirmActionForm";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const filterSelectClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

export default async function AdminInterviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    deleted?: "all" | "yes" | "no";
    page?: string;
  }>;
}) {
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

  const sp = searchParams ? await searchParams : undefined;
  const q = (sp?.q ?? "").trim();
  const status = (sp?.status ?? "").trim();
  const deleted = sp?.deleted ?? "all";
  const page = Math.max(1, Number(sp?.page ?? "1") || 1);
  const pageSize = 30;

  const where = {
    ...(q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
    ...(status ? { status: status as "IN_PROGRESS" | "COMPLETED" | "ABORTED" } : {}),
    ...(deleted === "yes"
      ? { deletedAt: { not: null } }
      : deleted === "no"
        ? { deletedAt: null }
        : {}),
  };

  const [statusCounts, activeCount, deletedCount, filteredCount, recentInterviews] = await Promise.all([
    prisma.interviewSession.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { status: "desc" } },
    }),
    prisma.interviewSession.count({ where: { deletedAt: null } }),
    prisma.interviewSession.count({ where: { deletedAt: { not: null } } }),
    prisma.interviewSession.count({ where }),
    prisma.interviewSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const paramsForPage = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (deleted !== "all") params.set("deleted", deleted);
    params.set("page", String(targetPage));
    return `/admin/interviews?${params.toString()}`;
  };
  const filterFormKey = `${q}|${status}|${deleted}`;

  const candidates = Object.values(
    recentInterviews.reduce<Record<string, {
      key: string;
      name: string;
      email: string;
      sessions: typeof recentInterviews;
      activeSessions: number;
      deletedSessions: number;
    }>>((acc, session) => {
      const email = session.user.email ?? "unknown@snapinterview.local";
      const key = email.toLowerCase();

      if (!acc[key]) {
        acc[key] = {
          key,
          name: session.user.name ?? "Unknown user",
          email,
          sessions: [],
          activeSessions: 0,
          deletedSessions: 0,
        };
      }

      acc[key].sessions.push(session);
      if (session.deletedAt) {
        acc[key].deletedSessions += 1;
      } else {
        acc[key].activeSessions += 1;
      }

      return acc;
    }, {}),
  ).sort((a, b) => b.sessions.length - a.sessions.length);

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

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form key={filterFormKey} className="grid gap-3 md:grid-cols-5">
          <Input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search candidate name/email"
          />
          <select
            name="status"
            defaultValue={status}
            className={filterSelectClass}
          >
            <option value="">All statuses</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ABORTED">ABORTED</option>
          </select>
          <select
            name="deleted"
            defaultValue={deleted}
            className={filterSelectClass}
          >
            <option value="all">All record states</option>
            <option value="no">Active only</option>
            <option value="yes">Soft-deleted only</option>
          </select>
          <Button type="submit" size="md" className="w-full">
            Apply filters
          </Button>
          <Link href="/admin/interviews" className="w-full">
            <Button type="button" variant="secondary" size="md" className="w-full">
              Clear filters
            </Button>
          </Link>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {statusCounts.map((status) => (
          <div key={status.status} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{status.status}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{status._count._all.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        {candidates.map((candidate) => (
          <details key={candidate.key} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-4 py-3 hover:bg-zinc-50">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="pb-1 font-medium">Candidate</th>
                    <th className="pb-1 font-medium">Total</th>
                    <th className="pb-1 font-medium">Active</th>
                    <th className="pb-1 font-medium">Deleted</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pt-1">
                      <p className="font-medium text-zinc-900">{candidate.name}</p>
                      <p className="text-xs text-zinc-500">{candidate.email}</p>
                    </td>
                    <td className="pt-1 text-zinc-700">{candidate.sessions.length}</td>
                    <td className="pt-1 text-zinc-700">{candidate.activeSessions}</td>
                    <td className="pt-1 text-zinc-700">{candidate.deletedSessions}</td>
                  </tr>
                </tbody>
              </table>
            </summary>

            <div className="border-t border-zinc-100 p-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Difficulty</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Record State</th>
                      <th className="px-3 py-2">Transcript Entries</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.sessions.map((session) => (
                      <tr key={session.id} className="border-b border-zinc-100 last:border-b-0">
                        <td className="px-3 py-2 text-zinc-700">{session.role}</td>
                        <td className="px-3 py-2 text-zinc-700">{session.type}</td>
                        <td className="px-3 py-2 text-zinc-700">{session.difficulty}</td>
                        <td className="px-3 py-2 text-zinc-700">{session.status}</td>
                        <td className="px-3 py-2 text-zinc-700">{session.deletedAt ? "Soft Deleted" : "Active"}</td>
                        <td className="px-3 py-2 text-zinc-700">{session.transcript.length}</td>
                        <td className="px-3 py-2 text-zinc-700">{formatDate(session.createdAt)}</td>
                        <td className="px-3 py-2">
                          {session.deletedAt ? (
                            <ConfirmActionForm
                              action={restoreInterviewAction}
                              hiddenFields={{ interviewId: session.id }}
                              buttonLabel="Restore"
                              buttonClassName="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                              confirmMessage="Restore this interview record?"
                            />
                          ) : (
                            <ConfirmActionForm
                              action={softDeleteInterviewAction}
                              hiddenFields={{ interviewId: session.id }}
                              buttonLabel="Soft Delete"
                              buttonClassName="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              confirmMessage="Soft delete this interview record?"
                              reasonRequired
                              reasonPrompt="Reason for soft deleting this interview"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </section>

      <section className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="text-zinc-600">
          Showing {(page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, filteredCount)} of {filteredCount}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={paramsForPage(prevPage)}
            className={`rounded-md border px-3 py-1.5 ${page === 1 ? "pointer-events-none border-zinc-100 text-zinc-300" : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"}`}
          >
            Previous
          </Link>
          <span className="text-zinc-500">Page {page} / {totalPages}</span>
          <Link
            href={paramsForPage(nextPage)}
            className={`rounded-md border px-3 py-1.5 ${page === totalPages ? "pointer-events-none border-zinc-100 text-zinc-300" : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"}`}
          >
            Next
          </Link>
        </div>
      </section>
    </div>
  );
}
