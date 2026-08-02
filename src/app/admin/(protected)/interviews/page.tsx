import Link from "next/link";

import {
  hardDeleteInterviewAction,
  repairLegacyRecordingMetadataAction,
} from "@/app/admin/(protected)/interviews/actions";
import {
  adminActionButtonClass,
  adminActionLinkClass,
  adminDangerButtonClass,
  adminInputOverrideClass,
  adminPaginationLinkClass,
  adminPaginationLinkDisabledClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
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
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[#F2F4F8] outline-none transition-colors focus:border-[#3B82F6]/45 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#3B82F6]/25";

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
        <h2 className="text-2xl font-semibold tracking-tight text-[#F2F4F8]">Interviews</h2>
        <p className="mt-1 text-sm text-[#A8B0C2]">
          Session moderation, recording integrity checks, and permanent deletion.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
          <p className="text-sm text-[#A8B0C2]">Total Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{totalCount.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
        <form key={filterFormKey} className="grid gap-3 md:grid-cols-5">
          <Input type="text" name="q" defaultValue={q} placeholder="Search candidate name/email" className={adminInputOverrideClass} />
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
          <Button type="submit" size="md" className={`w-full ${adminPrimaryButtonClass}`}>
            Apply filters
          </Button>
          <Link href="/admin/interviews" className="w-full">
            <Button type="button" variant="secondary" size="md" className={`w-full ${adminSecondaryButtonClass}`}>
              Clear filters
            </Button>
          </Link>
        </form>
        {integrityFilter === "issues" && (
          <p className="mt-3 text-xs text-[#A8B0C2]">
            Showing {visibleInterviews.length} of {recentInterviews.length} sessions on this page with
            missing storage or URL/key mismatch.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {statusCounts.map((row) => (
          <div key={row.status} className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
            <p className="text-sm text-[#A8B0C2]">{row.status}</p>
            <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{row._count._all.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-8 text-center text-sm text-[#A8B0C2]">
            No interviews match the current filters.
          </div>
        ) : (
          candidates.map((candidate) => (
            <details
              key={candidate.key}
              className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]"
            >
              <summary className="list-none px-4 py-3 hover:bg-white/[0.03]">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-[#A8B0C2]">
                    <tr>
                      <th className="pb-1 font-medium">Candidate</th>
                      <th className="pb-1 font-medium">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pt-1">
                        <p className="font-medium text-[#F2F4F8]">{candidate.name}</p>
                        <p className="text-xs text-[#A8B0C2]">{candidate.email}</p>
                      </td>
                      <td className="pt-1 text-[#C5CBD8]">{candidate.sessions.length}</td>
                    </tr>
                  </tbody>
                </table>
              </summary>

              <div className="border-t border-white/[0.06] p-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-white/[0.08] bg-white/[0.02] text-left text-xs uppercase tracking-wide text-[#A8B0C2]">
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
                          <tr key={session.id} className="border-b border-white/[0.05] last:border-b-0">
                            <td className="px-3 py-2 text-[#C5CBD8]">{session.role}</td>
                            <td className="px-3 py-2 text-[#C5CBD8]">{session.type}</td>
                            <td className="px-3 py-2 text-[#C5CBD8]">{session.difficulty}</td>
                            <td className="px-3 py-2 text-[#C5CBD8]">{session.status}</td>
                            <td className="px-3 py-2">
                              <IntegrityBadge integrity={integrity} />
                            </td>
                            <td className="px-3 py-2 text-[#C5CBD8]">{session._count.transcript}</td>
                            <td className="px-3 py-2 text-[#C5CBD8]">{formatDate(session.createdAt)}</td>
                            <td className="px-3 py-2">
                              <Link
                                href={`/admin/interviews/${session.id}`}
                                className={adminActionLinkClass}
                              >
                                View
                              </Link>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {integrity.status === "url_without_key" && (
                                  <form action={repairLegacyRecordingMetadataAction}>
                                    <input type="hidden" name="interviewId" value={session.id} />
                                    <button type="submit" className={adminActionButtonClass}>
                                      Repair
                                    </button>
                                  </form>
                                )}
                                <ConfirmActionForm
                                  action={hardDeleteInterviewAction}
                                  hiddenFields={{ interviewId: session.id }}
                                  buttonLabel="Delete"
                                  buttonClassName={adminDangerButtonClass}
                                  confirmMessage="Permanently delete this interview, transcript, feedback, moderation notes, and S3 recording? This cannot be undone."
                                  reasonRequired
                                  reasonPrompt="Reason for deletion"
                                />
                              </div>
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

      <section className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#12141A] px-4 py-3 text-sm">
        <p className="text-[#A8B0C2]">
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
          <span className="text-[#A8B0C2]">
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
