"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type StatCard = {
  label: string;
  value: string;
  hint: string;
};

type TrendPoint = {
  label: string;
  interviews: number;
  users: number;
};

type StatusPoint = {
  status: string;
  count: number;
};

type ActivityItem = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  status: string;
  createdAt: string;
};

type AdminOverviewDashboardProps = {
  cards: StatCard[];
  trends: TrendPoint[];
  statusBreakdown: StatusPoint[];
  recentActivity: ActivityItem[];
};

function barColor(metric: "interviews" | "users") {
  return metric === "interviews" ? "bg-zinc-900 group-hover:bg-zinc-700" : "bg-blue-500 group-hover:bg-blue-600";
}

export default function AdminOverviewDashboard({
  cards,
  trends,
  statusBreakdown,
  recentActivity,
}: AdminOverviewDashboardProps) {
  const [metric, setMetric] = useState<"interviews" | "users">("interviews");

  const maxValue = useMemo(() => {
    const vals = trends.map((item) => item[metric]);
    return Math.max(1, ...vals);
  }, [trends, metric]);

  return (
    <div className="space-y-6 pb-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Overview</h2>
        <p className="mt-1 text-sm text-zinc-500">Operational health, growth trends, and recent interview activity.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{card.value}</p>
            <p className="mt-1 text-xs text-zinc-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">7-Day Trend</h3>
              <p className="text-xs text-zinc-400">Switch metric to inspect usage patterns</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMetric("interviews")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium ${metric === "interviews" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
              >
                Interviews
              </button>
              <button
                onClick={() => setMetric("users")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium ${metric === "users" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
              >
                New Users
              </button>
            </div>
          </div>

          <div className="mt-4 flex min-h-[180px] items-end gap-2">
            {trends.map((point, idx) => {
              const value = point[metric];
              const height = Math.max(6, (value / maxValue) * 100);
              return (
                <div key={point.label} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-40 w-full items-end">
                    <motion.div
                      className={`w-full rounded-md transition-colors ${barColor(metric)}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.4, delay: idx * 0.04 }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                        {value}
                      </span>
                    </motion.div>
                  </div>
                  <span className="text-[11px] text-zinc-400">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-900">Interview Status Mix</h3>
          <p className="text-xs text-zinc-400">Active records only</p>
          <div className="mt-4 space-y-3">
            {statusBreakdown.map((item) => {
              const total = statusBreakdown.reduce((sum, entry) => sum + entry.count, 0) || 1;
              const width = Math.round((item.count / total) * 100);
              return (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700">{item.status}</span>
                    <span className="text-zinc-500">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-zinc-700" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Recent Interview Activity</h3>
          <Link href="/admin/interviews" className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-900">
            View all
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">No recent interview activity.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.candidateName}</p>
                  <p className="text-xs text-zinc-500">{item.candidateEmail} · {item.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-zinc-700">{item.status}</p>
                  <p className="text-xs text-zinc-400">{item.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Quick Admin Access</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/users" className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100">Users</Link>
          <Link href="/admin/questions" className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100">Questions</Link>
          <Link href="/admin/interviews" className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100">Interviews</Link>
          <Link href="/admin/analytics" className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100">Analytics</Link>
        </div>
      </section>
    </div>
  );
}

