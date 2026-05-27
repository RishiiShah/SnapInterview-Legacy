import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

export default async function AdminUsersPage() {
  async function lockUserAction(formData: FormData) {
    "use server";
    await requireAdminSession();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        failedLoginCount: 5,
      },
    });

    revalidatePath("/admin/users");
  }

  async function unlockUserAction(formData: FormData) {
    "use server";
    await requireAdminSession();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginCount: 0,
      },
    });

    revalidatePath("/admin/users");
  }

  async function revokeSessionsAction(formData: FormData) {
    "use server";
    await requireAdminSession();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return;

    await prisma.session.deleteMany({
      where: { userId },
    });

    revalidatePath("/admin/users");
  }

  const now = new Date();

  const [totalUsers, onboardedUsers, lockedUsers, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { onboardingCompletedAt: { not: null } } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        onboardingCompletedAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        interviewSessions: { where: { deletedAt: null }, select: { id: true } },
      },
    }),
  ]);

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
                  <td className="px-4 py-3 text-zinc-700">{user.interviewSessions.length}</td>
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
                        <form action={unlockUserAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                          >
                            Unlock
                          </button>
                        </form>
                      ) : (
                        <form action={lockUserAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Lock 24h
                          </button>
                        </form>
                      )}
                      <form action={revokeSessionsAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Revoke Sessions
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
