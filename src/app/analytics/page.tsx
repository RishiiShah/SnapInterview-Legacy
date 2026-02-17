"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES } from "@/data/constants";

export default function AnalyticsPage() {
    // Mock analytics data (will come from DB)
    const weeklyScores = [
        { label: "Mon", value: 72 }, { label: "Tue", value: 85 }, { label: "Wed", value: 68 },
        { label: "Thu", value: 90 }, { label: "Fri", value: 78 }, { label: "Sat", value: 82 },
        { label: "Sun", value: 88 },
    ];

    const monthlyComparison = [
        { label: "This Month", interviews: 12, avgScore: 82, hours: 8.5 },
        { label: "Last Month", interviews: 9, avgScore: 74, hours: 6.2 },
    ];

    const categoryBreakdown = [
        { category: "Behavioral", score: 85, total: 100, color: "bg-blue-500", lightColor: "bg-blue-100" },
        { category: "Technical", score: 72, total: 100, color: "bg-purple-500", lightColor: "bg-purple-100" },
        { category: "System Design", score: 68, total: 100, color: "bg-amber-500", lightColor: "bg-amber-100" },
        { category: "Leadership", score: 90, total: 100, color: "bg-emerald-500", lightColor: "bg-emerald-100" },
    ];

    const strengths = [
        { skill: "Communication clarity", score: 92 },
        { skill: "STAR method structure", score: 88 },
        { skill: "Leadership examples", score: 85 },
    ];
    const weaknesses = [
        { skill: "System scalability", score: 62 },
        { skill: "Time complexity analysis", score: 65 },
        { skill: "Edge case handling", score: 68 },
    ];

    return (
        <DashboardShell>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Analytics</h1>
                    <p className="mt-1 text-sm text-zinc-500">Track your progress and identify areas for improvement.</p>
                </div>

                {/* Monthly Comparison */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: "Interviews", current: monthlyComparison[0].interviews, prev: monthlyComparison[1].interviews, suffix: "" },
                        { label: "Avg Score", current: monthlyComparison[0].avgScore, prev: monthlyComparison[1].avgScore, suffix: "/100" },
                        { label: "Hours Practiced", current: monthlyComparison[0].hours, prev: monthlyComparison[1].hours, suffix: "h" },
                    ].map((stat) => {
                        const diff = stat.current - stat.prev;
                        const pct = stat.prev > 0 ? Math.round((diff / stat.prev) * 100) : 0;
                        return (
                            <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
                                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
                                    {stat.current}<span className="text-lg font-medium text-zinc-400">{stat.suffix}</span>
                                </p>
                                <p className={`mt-1 text-xs font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {diff >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs last month
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Weekly Score Chart */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Weekly Performance</h3>
                        <p className="mb-6 text-xs text-zinc-400">Score trend this week</p>
                        <div className="flex items-end gap-4">
                            {weeklyScores.map((d) => {
                                const barH = Math.round((d.value / 100) * 160);
                                return (
                                    <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
                                        <span className="text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">{d.value}</span>
                                        <div className="w-full min-h-[4px] rounded-md bg-zinc-200 transition-colors group-hover:bg-zinc-900" style={{ height: barH }} />
                                        <span className="text-[10px] font-medium text-zinc-400">{d.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Category Breakdown</h3>
                        <p className="mb-6 text-xs text-zinc-400">Average score by category</p>
                        <div className="space-y-5">
                            {categoryBreakdown.map((cat) => (
                                <div key={cat.category}>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-700">{cat.category}</span>
                                        <span className="text-sm font-semibold text-zinc-900">{cat.score}%</span>
                                    </div>
                                    <div className={`h-2 w-full rounded-full ${cat.lightColor}`}>
                                        <div className={`h-full rounded-full ${cat.color} transition-all duration-500`} style={{ width: `${cat.score}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs">💪</span>
                            Strengths
                        </h3>
                        <div className="space-y-3">
                            {strengths.map((s) => (
                                <div key={s.skill} className="flex items-center justify-between rounded-lg bg-emerald-50/50 px-4 py-3">
                                    <span className="text-sm font-medium text-zinc-700">{s.skill}</span>
                                    <span className="text-sm font-semibold text-emerald-700">{s.score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs">🎯</span>
                            Areas to Improve
                        </h3>
                        <div className="space-y-3">
                            {weaknesses.map((w) => (
                                <div key={w.skill} className="flex items-center justify-between rounded-lg bg-amber-50/50 px-4 py-3">
                                    <span className="text-sm font-medium text-zinc-700">{w.skill}</span>
                                    <span className="text-sm font-semibold text-amber-700">{w.score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
