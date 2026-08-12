"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  adminHeadingClass,
  adminMutedClass,
  adminPanelClass,
  adminSecondaryLinkClass,
} from "./admin-styles";

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
  return metric === "interviews"
    ? "bg-[#3B82F6] group-hover:bg-[#4B8FF7]"
    : "bg-sky-400/80 group-hover:bg-sky-400";
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
        <h2 className={adminHeadingClass}>Overview</h2>
        <p className={`mt-1 ${adminMutedClass}`}>
          Operational health, growth trends, and recent interview activity.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className={`${adminPanelClass} p-4`}>
            <p className="text-xs uppercase tracking-wide text-[#A8B0C2]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#F2F4F8]">{card.value}</p>
            <p className="mt-1 text-xs text-[#A8B0C2]">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className={`${adminPanelClass} p-5 lg:col-span-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#F2F4F8]">7-Day Trend</h3>
              <p className="text-xs text-[#A8B0C2]">Switch metric to inspect usage patterns</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMetric("interviews")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  metric === "interviews"
                    ? "bg-[#3B82F6] text-white"
                    : "bg-white/[0.04] text-[#A8B0C2] hover:bg-white/[0.06] hover:text-[#E8ECF4]"
                }`}
              >
                Interviews
              </button>
              <button
                onClick={() => setMetric("users")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  metric === "users"
                    ? "bg-[#3B82F6] text-white"
                    : "bg-white/[0.04] text-[#A8B0C2] hover:bg-white/[0.06] hover:text-[#E8ECF4]"
                }`}
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
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-[#C5CBD8] opacity-0 transition-opacity group-hover:opacity-100">
                        {value}
                      </span>
                    </motion.div>
                  </div>
                  <span className="text-[11px] text-[#A8B0C2]">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${adminPanelClass} p-5 lg:col-span-2`}>
          <h3 className="text-sm font-semibold text-[#F2F4F8]">Interview Status Mix</h3>
          <p className="text-xs text-[#A8B0C2]">Active records only</p>
          <div className="mt-4 space-y-3">
            {statusBreakdown.map((item) => {
              const total = statusBreakdown.reduce((sum, entry) => sum + entry.count, 0) || 1;
              const width = Math.round((item.count / total) * 100);
              return (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#C5CBD8]">{item.status}</span>
                    <span className="text-[#A8B0C2]">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={adminPanelClass}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#F2F4F8]">Recent Interview Activity</h3>
          <Link
            href="/admin/interviews"
            className="cursor-pointer text-xs font-medium text-[#A8B0C2] hover:text-[#E8ECF4]"
          >
            View all
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#A8B0C2]">No recent interview activity.</p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#F2F4F8]">{item.candidateName}</p>
                  <p className="text-xs text-[#A8B0C2]">
                    {item.candidateEmail} · {item.role}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-[#C5CBD8]">{item.status}</p>
                  <p className="text-xs text-[#A8B0C2]">{item.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${adminPanelClass} p-4`}>
        <h3 className="text-sm font-semibold text-[#F2F4F8]">Quick Admin Access</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/users" className={adminSecondaryLinkClass}>
            Users
          </Link>
          <Link href="/admin/questions" className={adminSecondaryLinkClass}>
            Questions
          </Link>
          <Link href="/admin/interviews" className={adminSecondaryLinkClass}>
            Interviews
          </Link>
          <Link href="/admin/analytics" className={adminSecondaryLinkClass}>
            Analytics
          </Link>
        </div>
      </section>
    </div>
  );
}
