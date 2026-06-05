import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export const ADMIN_OVERVIEW_STATS_TAG = "admin-overview-stats";

async function loadOverviewStats() {
  const now = new Date();

  const [totalUsers, totalInterviews, completedInterviews, lockedUsers, statusCounts] =
    await Promise.all([
      prisma.user.count(),
      prisma.interviewSession.count({ where: { deletedAt: null } }),
      prisma.interviewSession.count({
        where: { status: "COMPLETED", deletedAt: null },
      }),
      prisma.user.count({ where: { lockedUntil: { gt: now } } }),
      prisma.interviewSession.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

  return { totalUsers, totalInterviews, completedInterviews, lockedUsers, statusCounts };
}

export const getAdminOverviewStats = unstable_cache(
  loadOverviewStats,
  [ADMIN_OVERVIEW_STATS_TAG],
  { revalidate: 60, tags: [ADMIN_OVERVIEW_STATS_TAG] },
);
