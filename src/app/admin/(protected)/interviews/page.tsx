import Link from "next/link";

import { hardDeleteInterviewAction } from "@/app/admin/(protected)/interviews/actions";
import {
  adminActionLinkClass,
  adminDangerButtonClass,
  adminPaginationLinkClass,
  adminPaginationLinkDisabledClass,
} from "@/components/admin/admin-styles";
import { ConfirmActionForm } from "@/components/admin/ConfirmActionForm";
import { IntegrityBadge } from "@/components/admin/IntegrityBadge";
import {
  batchResolveRecordingIntegrity,
  recordingIntegrityHasIssue,
} from "@/lib/admin/recording-integrity";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    integrity?: "all" | "issues";
    page?: string;
  }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const q = (sp?.q ?? "").trim();
  const status = (sp?.status ?? "").trim();
  const integrityFilter = sp?.integrity ?? "all";
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
  };

  const verifyS3 = integrityFilter === "issues";

  const [statusCounts, totalCount, filteredCount, recentInterviews] = await Promise.all([
    prisma.interviewSession.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { status: "desc" } },
    }),
    prisma.interviewSession.count({ where: { deletedAt: null } }),
    prisma.interviewSession.count({ where: { ...where, deletedAt: null } }),
    prisma.interviewSession.findMany({
      where: { ...where, deletedAt: null },
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
        videoKey: true,
        videoUrl: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: { select: { transcript: true } },
      },
    }),
  ]);

  const integrityBySession = await batchResolveRecordingIntegrity(recentInterviews, {
    verifyS3,
  });

  const visibleInterviews =
    integrityFilter === "issues"
      ? recentInterviews.filter((session) =>
          recordingIntegrityHasIssue(integrityBySession.get(session.id)!.status),
        )
      : recentInterviews;

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const paramsForPage = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (integrityFilter !== "all") params.set("integrity", integrityFilter);
    params.set("page", String(targetPage));
    return `/admin/interviews?${params.toString()}`;
  };
  const filterFormKey = `${q}|${status}|${integrityFilter}`;

  const candidates = Object.values(
    visibleInterviews.reduce<
      Record<
        string,
        {
          key: string;
          name: string;
          email: string;
          sessions: typeof visibleInterviews;
        }
      >
    >((acc, session) => {
      const email = session.user.email ?? "unknown@snapinterview.local";
      const key = email.toLowerCase();

      if (!acc[key]) {
        acc[key] = {
          key,
          name: session.user.name ?? "Unknown user",
          email,
          sessions: [],
        };
      }

      acc[key].sessions.push(session);
      return acc;
    }, {}),
  ).sort((a, b) => b.sessions.length - a.sessions.length);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Interviews</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Session moderation, recording integrity checks, and permanent deletion.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Total Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{totalCount.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form key={filterFormKey} className="grid gap-3 md:grid-cols-5">
          <Input type="text" name="q" defaultValue={q} placeholder="Search candidate name/email" />
          <select name="status" defaultValue={status} className={filterSelectClass}>
            <option value="">All statuses</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ABORTED">ABORTED</option>
          </select>
          <select name="integrity" defaultValue={integrityFilter} className={filterSelectClass}>
            <option value="all">All recordings</option>
            <option value="issues">Recording issues only</option>
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
        {integrityFilter === "issues" && (
          <p className="mt-3 text-xs text-zinc-500">
            Showing {visibleInterviews.length} of {recentInterviews.length} sessions on this page with
            missing storage or URL/key mismatch.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {statusCounts.map((row) => (
          <div key={row.status} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{row.status}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{row._count._all.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
            No interviews match the current filters.
          </div>
        ) : (
          candidates.map((candidate) => (
            <details
              key={candidate.key}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <summary className="list-none px-4 py-3 hover:bg-zinc-50">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="pb-1 font-medium">Candidate</th>
                      <th className="pb-1 font-medium">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pt-1">
                        <p className="font-medium text-zinc-900">{candidate.name}</p>
                        <p className="text-xs text-zinc-500">{candidate.email}</p>
                      </td>
                      <td className="pt-1 text-zinc-700">{candidate.sessions.length}</td>
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
                        <th className="px-3 py-2">Recording</th>
                        <th className="px-3 py-2">Transcript</th>
                        <th className="px-3 py-2">Created</th>
                        <th className="px-3 py-2">Detail</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.sessions.map((session) => {
                        const integrity = integrityBySession.get(session.id)!;
                        return (
                          <tr key={session.id} className="border-b border-zinc-100 last:border-b-0">
                            <td className="px-3 py-2 text-zinc-700">{session.role}</td>
                            <td className="px-3 py-2 text-zinc-700">{session.type}</td>
                            <td className="px-3 py-2 text-zinc-700">{session.difficulty}</td>
                            <td className="px-3 py-2 text-zinc-700">{session.status}</td>
                            <td className="px-3 py-2">
                              <IntegrityBadge integrity={integrity} />
                            </td>
                            <td className="px-3 py-2 text-zinc-700">{session._count.transcript}</td>
                            <td className="px-3 py-2 text-zinc-700">{formatDate(session.createdAt)}</td>
                            <td className="px-3 py-2">
                              <Link
                                href={`/admin/interviews/${session.id}`}
                                className={adminActionLinkClass}
                              >
                                View
                              </Link>
                            </td>
                            <td className="px-3 py-2">
                              <ConfirmActionForm
                                action={hardDeleteInterviewAction}
                                hiddenFields={{ interviewId: session.id }}
                                buttonLabel="Delete"
                                buttonClassName={adminDangerButtonClass}
                                confirmMessage="Permanently delete this interview, transcript, feedback, moderation notes, and S3 recording? This cannot be undone."
                                reasonRequired
                                reasonPrompt="Reason for deletion"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ))
        )}
      </section>

      <section className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="text-zinc-600">
          Showing {(page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, filteredCount)} of {filteredCount}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={paramsForPage(prevPage)}
            className={page === 1 ? adminPaginationLinkDisabledClass : adminPaginationLinkClass}
          >
            Previous
          </Link>
          <span className="text-zinc-500">
            Page {page} / {totalPages}
          </span>
          <Link
            href={paramsForPage(nextPage)}
            className={page === totalPages ? adminPaginationLinkDisabledClass : adminPaginationLinkClass}
          >
            Next
          </Link>
        </div>
      </section>
    </div>
  );
}
