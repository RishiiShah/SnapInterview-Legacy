import { prisma } from "@/lib/prisma";
import AdminOverviewDashboard from "@/components/admin/AdminOverviewDashboard";

export default async function AdminPage() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const [totalUsers, totalQuestions, totalInterviews, completedInterviews, lockedUsers, statusCounts, recentInterviews, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.practiceQuestion.count(),
    prisma.interviewSession.count(),
    prisma.interviewSession.count({ where: { status: "COMPLETED", deletedAt: null } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
    prisma.interviewSession.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.interviewSession.findMany({
      where: { createdAt: { gte: start } },
      select: {
        id: true,
        createdAt: true,
        status: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
  ]);

  const completionRate = totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

  const cards = [
    { label: "Total Users", value: totalUsers.toLocaleString(), hint: "All registered users" },
    { label: "Question Bank", value: totalQuestions.toLocaleString(), hint: "Published practice questions" },
    { label: "Total Interviews", value: totalInterviews.toLocaleString(), hint: "All sessions recorded" },
    { label: "Completion Rate", value: `${completionRate}%`, hint: "Completed / total interviews" },
    { label: "Locked Accounts", value: lockedUsers.toLocaleString(), hint: "Currently locked users" },
  ];

  const dayKeys = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    return { key, label };
  });

  const interviewCountMap = new Map<string, number>();
  recentInterviews.forEach((row) => {
    const key = row.createdAt.toISOString().slice(0, 10);
    interviewCountMap.set(key, (interviewCountMap.get(key) ?? 0) + 1);
  });

  const userCountMap = new Map<string, number>();
  recentUsers.forEach((row) => {
    const key = row.createdAt.toISOString().slice(0, 10);
    userCountMap.set(key, (userCountMap.get(key) ?? 0) + 1);
  });

  const trends = dayKeys.map(({ key, label }) => ({
    label,
    interviews: interviewCountMap.get(key) ?? 0,
    users: userCountMap.get(key) ?? 0,
  }));

  const statusBreakdown = statusCounts.map((entry) => ({
    status: entry.status,
    count: entry._count._all,
  }));

  const recentActivity = recentInterviews.map((item) => ({
    id: item.id,
    candidateName: item.user.name ?? "Unknown",
    candidateEmail: item.user.email ?? "unknown@snapinterview.local",
    role: item.role,
    status: item.status,
    createdAt: item.createdAt.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return <AdminOverviewDashboard cards={cards} trends={trends} statusBreakdown={statusBreakdown} recentActivity={recentActivity} />;
}
