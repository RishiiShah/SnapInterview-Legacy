import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [totalUsers, totalQuestions, totalInterviews, completedInterviews, lockedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.practiceQuestion.count(),
    prisma.interviewSession.count(),
    prisma.interviewSession.count({ where: { status: "COMPLETED", deletedAt: null } }),
    prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
  ]);

  const completionRate = totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

  const cards = [
    { label: "Total Users", value: totalUsers.toLocaleString() },
    { label: "Question Bank Size", value: totalQuestions.toLocaleString() },
    { label: "Total Interviews", value: totalInterviews.toLocaleString() },
    { label: "Interview Completion Rate", value: `${completionRate}%` },
    { label: "Currently Locked Users", value: lockedUsers.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Overview</h2>
        <p className="mt-1 text-sm text-zinc-500">Operational summary across users, questions, and interviews.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-zinc-900">Modules</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/users" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            User Management
          </Link>
          <Link href="/admin/questions" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Question Bank
          </Link>
          <Link href="/admin/interviews" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Interview Sessions
          </Link>
        </div>
      </section>
    </div>
  );
}
