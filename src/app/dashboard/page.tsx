import { getServerSession } from "next-auth/next";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardOverviewClient from "@/components/dashboard/DashboardOverviewClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const isFirstLogin = session?.user?.isFirstLogin ?? false;

  const stats = [
    { label: "Interviews Completed", value: "12", change: "+3 this week", iconKey: "completed" as const },
    { label: "Average Score", value: "78", change: "+5 pts vs last month", suffix: "/100", iconKey: "average" as const },
    { label: "Hours Practiced", value: "8.5", change: "2.5h this week", suffix: "h", iconKey: "hours" as const },
    { label: "Current Streak", value: "5", change: "Personal best!", suffix: " days 🔥", iconKey: "streak" as const },
  ];

  const recentSessions = [
    { id: 1, role: "Frontend Developer", company: "Google", score: 85, duration: "28 min", date: "Feb 11, 2026" },
    { id: 2, role: "Product Manager", company: "Meta", score: 72, duration: "32 min", date: "Feb 10, 2026" },
    { id: 3, role: "Data Scientist", company: "Netflix", score: 90, duration: "25 min", date: "Feb 9, 2026" },
    { id: 4, role: "Backend Engineer", company: "Amazon", score: 68, duration: "30 min", date: "Feb 8, 2026" },
    { id: 5, role: "UX Designer", company: "Apple", score: 79, duration: "22 min", date: "Feb 7, 2026" },
  ];

  const chartData = [
    { label: "Feb 5", value: 62 },
    { label: "Feb 6", value: 70 },
    { label: "Feb 7", value: 79 },
    { label: "Feb 8", value: 68 },
    { label: "Feb 9", value: 90 },
    { label: "Feb 10", value: 72 },
    { label: "Feb 11", value: 85 },
  ];

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
