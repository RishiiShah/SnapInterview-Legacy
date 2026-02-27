"use client";

import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import { motion } from "framer-motion";

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
        { category: "Behavioral", score: 85 },
        { category: "Technical", score: 72 },
        { category: "System Design", score: 68 },
        { category: "Leadership", score: 90 },
    ];

    const strengths = ["Communication clarity", "STAR method structure", "Leadership examples"];
    const improvements = ["System scalability", "Time complexity analysis", "Edge case handling"];

    return (
        <DashboardShell>
            <div className="space-y-8">
                <SlideIn>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Analytics</h1>
                        <p className="mt-1 text-sm text-zinc-500">Track your progress and identify areas for improvement.</p>
                        </div>
                        <Link
                            href="/recordings"
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50"
                        >
                            View Recordings
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                </SlideIn>

                {/* Monthly Comparison */}
                <FadeInStagger className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: "Interviews", current: monthlyComparison[0].interviews, prev: monthlyComparison[1].interviews, suffix: "" },
                        { label: "Avg Score", current: monthlyComparison[0].avgScore, prev: monthlyComparison[1].avgScore, suffix: "/100" },
                        { label: "Hours Practiced", current: monthlyComparison[0].hours, prev: monthlyComparison[1].hours, suffix: "h" },
                    ].map((stat) => {
                        const diff = stat.current - stat.prev;
                        const pct = stat.prev > 0 ? Math.round((diff / stat.prev) * 100) : 0;
                        return (
                            <FadeInStaggerItem key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
                                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
                                    {stat.current}<span className="text-lg font-medium text-zinc-400">{stat.suffix}</span>
                                </p>
                                <p className={`mt-1 text-xs font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {diff >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs last month
                                </p>
                            </FadeInStaggerItem>
                        );
                    })}
                </FadeInStagger>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Weekly Score Chart */}
                    <FadeIn delay={0.2} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Weekly Performance</h3>
                        <p className="mb-2 text-xs text-zinc-400">Score trend this week</p>
                        <div className="flex items-end gap-3 flex-1 min-h-[170px] pt-3 mt-1">
                            {weeklyScores.map((d, i) => {
                                return (
                                    <div key={d.label} className="group flex flex-1 flex-col justify-end items-center gap-2 h-full">
                                        <div className="relative flex-1 w-full flex items-end">
                                            <motion.div
                                                className="w-full relative rounded-md bg-zinc-200 transition-colors group-hover:bg-zinc-900 origin-bottom"
                                                initial={{ height: "0%" }}
                                                animate={{ height: `${Math.min(100, Math.max(4, d.value * 1.15))}%` }}
                                                transition={{
                                                    duration: 0.8,
                                                    delay: 0.4 + (i * 0.1),
                                                    ease: [0.21, 0.47, 0.32, 0.98],
                                                }}
                                            >
                                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-medium text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                                                    {d.value}
                                                </span>
                                            </motion.div>
                                        </div>
                                        <span className="text-[10px] text-zinc-400">{d.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </FadeIn>

                    {/* Category Breakdown */}
                    <FadeIn delay={0.3} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Category Breakdown</h3>
                        <p className="mb-4 text-xs text-zinc-400">Performance by interview dimension</p>
                        <div className="space-y-3">
                            {categoryBreakdown.map((cat) => (
                                <div key={cat.category} className="rounded-xl border border-zinc-100 p-3">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-700">{cat.category}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-zinc-900">{cat.score}%</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.score >= 80 ? "bg-emerald-100 text-emerald-700" : cat.score >= 70 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                                {cat.score >= 80 ? "Strong" : cat.score >= 70 ? "Steady" : "Improve"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-zinc-100">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${cat.score >= 80 ? "bg-emerald-500" : cat.score >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                                            style={{ width: `${cat.score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid gap-6 lg:grid-cols-2 pb-8">
                    <FadeIn delay={0.4} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Strengths</h3>
                        <p className="mb-4 text-xs text-zinc-400">Keep leveraging these in interviews</p>
                        <div className="space-y-2.5">
                            {strengths.map((skill, idx) => (
                                <div key={skill} className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-3">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-700">{idx + 1}</span>
                                    <span className="text-sm font-medium text-zinc-700">{skill}</span>
                                </div>
                            ))}
                        </div>
                    </FadeIn>

                    <FadeIn delay={0.5} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Areas to Improve</h3>
                        <p className="mb-4 text-xs text-zinc-400">Focus areas for your next sessions</p>
                        <div className="space-y-2.5">
                            {improvements.map((skill, idx) => (
                                <div key={skill} className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/40 px-3.5 py-3">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-100 text-xs font-semibold text-amber-700">{idx + 1}</span>
                                    <span className="text-sm font-medium text-zinc-700">{skill}</span>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>
            </div>
        </DashboardShell>
    );
}
