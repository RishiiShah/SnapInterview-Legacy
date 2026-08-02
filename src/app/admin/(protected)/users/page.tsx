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
  adminInputOverrideClass,
  adminPaginationLinkClass,
  adminPaginationLinkDisabledClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
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
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[#F2F4F8] outline-none transition-colors focus:border-[#3B82F6]/45 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#3B82F6]/25";

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
        <h2 className="text-2xl font-semibold tracking-tight text-[#F2F4F8]">Users</h2>
        <p className="mt-1 text-sm text-[#A8B0C2]">Recent users and account health indicators.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
          <p className="text-sm text-[#A8B0C2]">Total Users</p>
          <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{totalUsers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
          <p className="text-sm text-[#A8B0C2]">Onboarding Completed</p>
          <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{onboardedUsers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
          <p className="text-sm text-[#A8B0C2]">Currently Locked</p>
          <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{lockedUsers.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#12141A] p-4">
        <form key={filterFormKey} className="grid gap-3 md:grid-cols-5">
          <Input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            className={adminInputOverrideClass}
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
          <Button type="submit" size="md" className={`w-full ${adminPrimaryButtonClass}`}>
            Apply filters
          </Button>
          <Link href="/admin/users" className="w-full">
            <Button type="button" variant="secondary" size="md" className={`w-full ${adminSecondaryButtonClass}`}>
              Clear filters
            </Button>
          </Link>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#12141A]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-left text-xs uppercase tracking-wide text-[#A8B0C2]">
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
                <tr key={user.id} className="border-b border-white/[0.05] last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#F2F4F8]">{user.name}</p>
                    <p className="text-xs text-[#A8B0C2]">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#C5CBD8]">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-[#C5CBD8]">{user.onboardingCompletedAt ? "Completed" : "Pending"}</td>
                  <td className="px-4 py-3 text-[#C5CBD8]">{user._count.interviewSessions}</td>
                  <td className="px-4 py-3 text-[#C5CBD8]">{user.failedLoginCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isLocked ? "border border-red-500/30 bg-red-500/10 text-red-300" : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
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

      <section className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#12141A] px-4 py-3 text-sm">
        <p className="text-[#A8B0C2]">
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
          <span className="text-[#A8B0C2]">Page {page} / {totalPages}</span>
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
