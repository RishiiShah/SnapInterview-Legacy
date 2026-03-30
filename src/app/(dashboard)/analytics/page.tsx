import Link from "next/link";
import { redirect } from "next/navigation";

import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import PerformanceChart from "@/components/analytics/PerformanceChart";
import CategoryBreakdown from "@/components/analytics/CategoryBreakdown";
import SubScoreTrendChart from "@/components/analytics/SubScoreTrendChart";
import { IconArrowRight } from "@/components/ui/icons";
import { getAnalyticsOverviewData } from "@/lib/interview/metrics";
import { getServerAuthSession } from "@/lib/server-auth";

export default async function AnalyticsPage() {
    const session = await getServerAuthSession();

    if (!session?.user) {
        redirect("/login");
    }

    const userId = session.user.id;

    const emptyWeeklyTrends = { communication: [], technicalDepth: [], clarity: [] };

    const {
        weeklyScores,
        weeklySubScoreTrends,
        monthlyComparison,
        categoryBreakdown,
        strengths,
        improvements,
        subScores,
    } = userId
        ? await getAnalyticsOverviewData(userId)
        : {
            weeklyScores: [],
            weeklySubScoreTrends: emptyWeeklyTrends,
            monthlyComparison: [
                { label: "This Month", interviews: 0, avgScore: 0, hours: 0 },
                { label: "Last Month", interviews: 0, avgScore: 0, hours: 0 },
            ],
            categoryBreakdown: [],
            strengths: [],
            improvements: [],
            subScores: { communication: null, technicalDepth: null, clarity: null },
        };

    return (
        <>
            <div className="space-y-7">
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
                            <IconArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </SlideIn>

                {/* Monthly Comparison */}
                <FadeInStagger triggerOnView={false} className="grid gap-3.5 sm:grid-cols-3">
                    {[
                        { label: "Interviews", current: monthlyComparison[0].interviews, prev: monthlyComparison[1].interviews, suffix: "" },
                        { label: "Avg Score", current: monthlyComparison[0].avgScore, prev: monthlyComparison[1].avgScore, suffix: "/100" },
                        { label: "Hours Practiced", current: monthlyComparison[0].hours, prev: monthlyComparison[1].hours, suffix: "h" },
                    ].map((stat) => {
                        const diff = stat.current - stat.prev;
                        const pct = stat.prev > 0 ? Math.round((diff / stat.prev) * 100) : 0;
                        return (
                            <FadeInStaggerItem key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-4.5">
                                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                                <p className="mt-1 text-[1.75rem] font-bold tracking-tight text-zinc-900 leading-none">
                                    {stat.current}<span className="text-lg font-medium text-zinc-400">{stat.suffix}</span>
                                </p>
                                <p className={`mt-1 text-xs font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {diff >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs last month
                                </p>
                            </FadeInStaggerItem>
                        );
                    })}
                </FadeInStagger>

                <div className="grid gap-4.5 lg:grid-cols-2">
                    <PerformanceChart weeklyScores={weeklyScores} delay={0.2} />
                    <CategoryBreakdown categories={categoryBreakdown} delay={0.3} />
                </div>

                {/* Sub-score Breakdown */}
                <FadeIn triggerOnView={false} delay={0.35} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <h3 className="mb-1 text-sm font-semibold text-zinc-900">Score Breakdown</h3>
                    <p className="mb-5 text-xs text-zinc-400">Average sub-scores across all evaluated interviews</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            { label: "Communication", value: subScores.communication, description: "Clarity and articulation" },
                            { label: "Technical Depth", value: subScores.technicalDepth, description: "Knowledge and reasoning" },
                            { label: "Clarity", value: subScores.clarity, description: "Structure and logical flow" },
                        ].map(({ label, value, description }) => (
                            <div key={label} className="rounded-xl border border-zinc-100 p-4">
                                <p className="text-xs font-medium text-zinc-500">{label}</p>
                                <p className="text-xs text-zinc-400 mt-0.5 mb-3">{description}</p>
                                {value !== null ? (
                                    <>
                                        <div className="flex items-end justify-between mb-1.5">
                                            <span className="text-2xl font-bold tracking-tight text-zinc-900">{value}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                value >= 80 ? "bg-emerald-100 text-emerald-700"
                                                : value >= 65 ? "bg-blue-100 text-blue-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}>
                                                {value >= 80 ? "Strong" : value >= 65 ? "Steady" : "Improve"}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-zinc-100">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    value >= 80 ? "bg-emerald-500"
                                                    : value >= 65 ? "bg-blue-500"
                                                    : "bg-amber-500"
                                                }`}
                                                style={{ width: `${value}%` }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-zinc-400 italic">No data yet</p>
                                )}
                            </div>
                        ))}
                    </div>
                </FadeIn>

                <SubScoreTrendChart trends={weeklySubScoreTrends} delay={0.4} />

                {/* Strengths & Weaknesses */}
                <div className="grid gap-6 lg:grid-cols-2 pb-8">
                    <FadeIn triggerOnView={false} delay={0.4} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Strengths</h3>
                        <p className="mb-4 text-xs text-zinc-400">Keep leveraging these in interviews</p>
                        <div className="space-y-2.5">
                            {strengths.length > 0 ? (
                                strengths.map((skill, idx) => (
                                    <div key={skill} className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-3">
                                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-700">{idx + 1}</span>
                                        <span className="text-sm font-medium text-zinc-700">{skill}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/30">
                                    <p className="text-sm font-medium text-zinc-500 italic">Complete an interview to get insights</p>
                                </div>
                            )}
                        </div>
                    </FadeIn>

                    <FadeIn triggerOnView={false} delay={0.5} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Areas to Improve</h3>
                        <p className="mb-4 text-xs text-zinc-400">Focus areas for your next sessions</p>
                        <div className="space-y-2.5">
                            {improvements.length > 0 ? (
                                improvements.map((skill, idx) => (
                                    <div key={skill} className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/40 px-3.5 py-3">
                                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-100 text-xs font-semibold text-amber-700">{idx + 1}</span>
                                        <span className="text-sm font-medium text-zinc-700">{skill}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/30">
                                    <p className="text-sm font-medium text-zinc-500 italic">Complete an interview to get insights</p>
                                </div>
                            )}
                        </div>
                    </FadeIn>
                </div>
            </div>
        </>
    );
}
