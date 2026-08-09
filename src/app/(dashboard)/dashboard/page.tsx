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

  const userId = session.user.id ?? session.session?.userId;
  if (!userId) {
    redirect("/login");
  }
  const onboardingUser = session.user.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { onboardingCompletedAt: true },
      })
    : await prisma.user.findUnique({
        where: { id: userId },
        select: { onboardingCompletedAt: true },
      });

  if (!onboardingUser?.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const isFirstLogin = session?.user?.isFirstLogin ?? false;

  const overview = userId
    ? await getDashboardOverviewData(userId)
    : {
        stats: [],
        recentSessions: [],
        topStrength: null,
        topFocus: null,
      };

  return (
    <>
      <DashboardOverviewClient
        userId={userId}
        firstName={firstName}
        isFirstLogin={isFirstLogin}
        stats={overview.stats}
        recentSessions={overview.recentSessions}
        topStrength={overview.topStrength}
        topFocus={overview.topFocus}
      />
    </>
  );
}
