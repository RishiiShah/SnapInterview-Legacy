import { redirect } from "next/navigation";

import DashboardOverviewClient from "@/components/dashboard/DashboardOverviewClient";
import { getDashboardOverviewData } from "@/lib/interview/metrics";
import { getServerAuthSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { onboardingCompletedAt: true },
      })
    : null;

  if (!user?.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const isFirstLogin = session?.user?.isFirstLogin ?? false;
  const email = session?.user?.email || "";

  const { stats, recentSessions, chartData } = email
    ? await getDashboardOverviewData(email)
    : { stats: [], recentSessions: [], chartData: [] };

  return (
    <>
      <DashboardOverviewClient
        firstName={firstName}
        isFirstLogin={isFirstLogin}
        stats={stats}
        recentSessions={recentSessions}
        chartData={chartData}
      />
    </>
  );
}
