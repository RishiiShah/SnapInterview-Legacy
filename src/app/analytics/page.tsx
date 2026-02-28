"use client";

import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import PerformanceChart from "@/components/analytics/PerformanceChart";
import CategoryBreakdown from "@/components/analytics/CategoryBreakdown";

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
                    <PerformanceChart weeklyScores={weeklyScores} delay={0.2} />
                    <CategoryBreakdown categories={categoryBreakdown} delay={0.3} />
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
