import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export const ADMIN_USER_STATS_TAG = "admin-user-stats";

async function loadUserGlobalStats() {
  const now = new Date();

  const [totalUsers, onboardedUsers, lockedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { onboardingCompletedAt: { not: null } } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
  ]);

  return { totalUsers, onboardedUsers, lockedUsers };
}

export const getAdminUserGlobalStats = unstable_cache(
  loadUserGlobalStats,
  [ADMIN_USER_STATS_TAG],
  { revalidate: 60, tags: [ADMIN_USER_STATS_TAG] },
);
