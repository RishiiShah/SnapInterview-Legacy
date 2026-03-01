import { getServerSession } from "next-auth/next";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardOverviewClient from "@/components/dashboard/DashboardOverviewClient";
import { getDashboardOverviewData } from "@/lib/interview/metrics";

export default async function DashboardPage() {
  const session = await getServerSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const isFirstLogin = session?.user?.isFirstLogin ?? false;
  const email = session?.user?.email || "";

  const { stats, recentSessions, chartData } = email
    ? await getDashboardOverviewData(email)
    : { stats: [], recentSessions: [], chartData: [] };

  return (
    <DashboardShell>
      <DashboardOverviewClient
        firstName={firstName}
        isFirstLogin={isFirstLogin}
        stats={stats}
        recentSessions={recentSessions}
        chartData={chartData}
      />
    </DashboardShell>
  );
}
