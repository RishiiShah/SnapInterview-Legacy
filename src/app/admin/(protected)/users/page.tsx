import { getAdminUserGlobalStats } from "@/lib/admin/user-stats";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { normalizeEmail } from "@/lib/security";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  adminActionButtonClass,
  adminDangerButtonClass,
  adminPaginationLinkClass,
  adminPaginationLinkDisabledClass,
} from "@/components/admin/admin-styles";
import { ConfirmActionForm } from "@/components/admin/ConfirmActionForm";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

const filterSelectClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    lock?: "all" | "locked" | "active";
    onboarding?: "all" | "completed" | "pending";
    page?: string;
  }>;
}) {
  async function lockUserAction(formData: FormData) {
    "use server";
    const adminSession = await requireAdminSession();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return;

    const reason = String(formData.get("reason") ?? "").trim() || "admin_manual_lock";

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      select: { id: true, email: true },
    });

    await recordSecurityEvent({
      type: "ACCOUNT_LOCKED",
      userId: user.id,
      email: normalizeEmail(user.email),
      metadata: {
        reason,
        adminUserId: adminSession.user.id,
        adminEmail: adminSession.user.email,
        lockDurationHours: 24,
      },
    });

    await revokeUserSessions({ userId: user.id, reason: "account_locked" });

    revalidatePath("/admin/users");
  }

  async function unlockUserAction(formData: FormData) {
    "use server";
    const adminSession = await requireAdminSession();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return;

    const reason = String(formData.get("reason") ?? "").trim() || "admin_manual_unlock";

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginCount: 0,
      },
      select: { id: true, email: true },
    });

    await recordSecurityEvent({
      type: "ACCOUNT_UNLOCKED",
      userId: user.id,
      email: normalizeEmail(user.email),
      metadata: {
        reason,
        adminUserId: adminSession.user.id,
        adminEmail: adminSession.user.email,
      },
    });

    revalidatePath("/admin/users");
  }

  async function revokeSessionsAction(formData: FormData) {
    "use server";
    const adminSession = await requireAdminSession();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return;

    const reason = String(formData.get("reason") ?? "").trim() || "admin_manual_revoke";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return;

    await revokeUserSessions({
      userId: user.id,
      email: normalizeEmail(user.email),
      reason: "admin_revoke",
      auditMetadata: {
        adminReason: reason,
        adminUserId: adminSession.user.id,
        adminEmail: adminSession.user.email,
      },
    });

    revalidatePath("/admin/users");
  }

  const now = new Date();
  const sp = searchParams ? await searchParams : undefined;
  const q = (sp?.q ?? "").trim();
  const lockFilter = sp?.lock ?? "all";
  const onboardingFilter = sp?.onboarding ?? "all";
  const page = Math.max(1, Number(sp?.page ?? "1") || 1);
  const pageSize = 20;

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(lockFilter === "locked"
      ? { lockedUntil: { gt: now } }
      : lockFilter === "active"
        ? { OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }
        : {}),
    ...(onboardingFilter === "completed"
      ? { onboardingCompletedAt: { not: null } }
      : onboardingFilter === "pending"
        ? { onboardingCompletedAt: null }
        : {}),
  };

  const [{ totalUsers, onboardedUsers, lockedUsers }, filteredUsersCount, users] = await Promise.all([
    getAdminUserGlobalStats(),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        onboardingCompletedAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        _count: {
          select: {
            interviewSessions: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredUsersCount / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const paramsForPage = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (lockFilter !== "all") params.set("lock", lockFilter);
    if (onboardingFilter !== "all") params.set("onboarding", onboardingFilter);
    params.set("page", String(targetPage));
    return `/admin/users?${params.toString()}`;
  };
  const filterFormKey = `${q}|${lockFilter}|${onboardingFilter}`;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Users</h2>
        <p className="mt-1 text-sm text-zinc-500">Recent users and account health indicators.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Total Users</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{totalUsers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Onboarding Completed</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{onboardedUsers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Currently Locked</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{lockedUsers.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form key={filterFormKey} className="grid gap-3 md:grid-cols-5">
          <Input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
          />
          <select
            name="lock"
            defaultValue={lockFilter}
            className={filterSelectClass}
          >
            <option value="all">All lock states</option>
            <option value="locked">Locked only</option>
            <option value="active">Active only</option>
          </select>
          <select
            name="onboarding"
            defaultValue={onboardingFilter}
            className={filterSelectClass}
          >
            <option value="all">All onboarding states</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          <Button type="submit" size="md" className="w-full">
            Apply filters
          </Button>
          <Link href="/admin/users" className="w-full">
            <Button type="button" variant="secondary" size="md" className="w-full">
              Clear filters
            </Button>
          </Link>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Onboarding</th>
              <th className="px-4 py-3">Interviews</th>
              <th className="px-4 py-3">Failed Logins</th>
              <th className="px-4 py-3">Lock Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isLocked = !!user.lockedUntil && user.lockedUntil > now;
              return (
                <tr key={user.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-700">{user.onboardingCompletedAt ? "Completed" : "Pending"}</td>
                  <td className="px-4 py-3 text-zinc-700">{user._count.interviewSessions}</td>
                  <td className="px-4 py-3 text-zinc-700">{user.failedLoginCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isLocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isLocked ? "Locked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {isLocked ? (
                        <ConfirmActionForm
                          action={unlockUserAction}
                          hiddenFields={{ userId: user.id }}
                          buttonLabel="Unlock"
                          buttonClassName={adminActionButtonClass}
                          confirmMessage={`Unlock ${user.email}?`}
                          reasonRequired
                          reasonPrompt="Reason for unlocking this user"
                        />
                      ) : (
                        <ConfirmActionForm
                          action={lockUserAction}
                          hiddenFields={{ userId: user.id }}
                          buttonLabel="Lock 24h"
                          buttonClassName={adminDangerButtonClass}
                          confirmMessage={`Lock ${user.email} for 24 hours?`}
                          reasonRequired
                          reasonPrompt="Reason for locking this user"
                        />
                      )}
                      <ConfirmActionForm
                        action={revokeSessionsAction}
                        hiddenFields={{ userId: user.id }}
                        buttonLabel="Revoke Sessions"
                        buttonClassName={adminActionButtonClass}
                        confirmMessage={`Revoke all sessions for ${user.email}?`}
                        reasonRequired
                        reasonPrompt="Reason for revoking sessions"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="text-zinc-600">
          Showing {(page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, filteredUsersCount)} of {filteredUsersCount}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={paramsForPage(prevPage)}
            className={page === 1 ? adminPaginationLinkDisabledClass : adminPaginationLinkClass}
          >
            Previous
          </Link>
          <span className="text-zinc-500">Page {page} / {totalPages}</span>
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
