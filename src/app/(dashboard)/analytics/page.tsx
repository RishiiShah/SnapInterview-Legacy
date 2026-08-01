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
        periodComparison,
        categoryBreakdown,
        strengths,
        improvements,
        subScores,
        totalSessions,
        feedbackStats,
    } = userId
        ? await getAnalyticsOverviewData(userId)
        : {
            weeklyScores: [],
            weeklySubScoreTrends: emptyWeeklyTrends,
            monthlyComparison: [
                { label: "This Month", interviews: 0, avgScore: 0, hours: 0 },
                { label: "Last Month", interviews: 0, avgScore: 0, hours: 0 },
            ],
            periodComparison: {
                currentSessions: 0,
                previousSessions: 0,
                currentAvg: null,
                previousAvg: null,
                scoreDelta: null,
                scoreDeltaPct: null,
                summary: "Start a session to track 30-day progress.",
            },
            categoryBreakdown: [],
            strengths: [],
            improvements: [],
            subScores: { communication: null, technicalDepth: null, clarity: null },
            totalSessions: 0,
            feedbackStats: { total: 0, thumbsUp: 0, thumbsDown: 0 },
        };

    const hasData = totalSessions > 0;

    return (
        <>
            <div className="space-y-10 pb-8">
                <SlideIn>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                        <h1 className="font-display text-2xl tracking-tight text-[#F2F4F8] sm:text-[1.75rem]">Analytics</h1>
                        <p className="mt-1.5 text-sm text-[#A8B0C2]">Track your progress and identify areas for improvement.</p>
                        </div>
                        <Link
                            href="/recordings"
                            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#C5CBD8] transition-colors hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-[#E8ECF4]"
                        >
                            View Recordings
                            <IconArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </SlideIn>

                {!hasData && (
                    <FadeIn triggerOnView={false} direction="up">
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-6 py-20 text-center">
                            <p className="text-base font-medium text-[#E8ECF4]">No interview data yet</p>
                            <p className="mt-1.5 max-w-sm text-sm text-[#A8B0C2]">
                                Complete a mock interview to unlock your performance analytics and track your progress over time.
                            </p>
                            <Link
                                href="/practice"
                                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
                            >
                                Start an Interview
                                <IconArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </FadeIn>
                )}

                {hasData && (<>
                {/* 30-day period summary — scoreboard style */}
                {periodComparison.currentSessions > 0 && (
                    <FadeIn triggerOnView={false} direction="up">
                        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
                            <div>
                                <p className="text-[12px] uppercase tracking-[0.14em] text-[#A8B0C2]">Last 30 days</p>
                                <p className="mt-2 text-[15px] font-medium text-[#E8ECF4]">{periodComparison.summary}</p>
                            </div>
                            {periodComparison.scoreDelta !== null && (
                                <div className="text-right">
                                    <div className="flex items-baseline justify-end gap-1.5 font-mono">
                                        <span className="text-3xl font-medium tracking-tight text-[#F2F4F8] sm:text-4xl">
                                            {periodComparison.currentAvg ?? 0}
                                        </span>
                                        <span className="text-sm text-[#A8B0C2]">vs {periodComparison.previousAvg ?? 0}</span>
                                    </div>
                                    <p className={`mt-1 text-xs font-medium ${
                                        periodComparison.scoreDelta > 0
                                            ? "text-emerald-400"
                                            : periodComparison.scoreDelta < 0
                                            ? "text-rose-300"
                                            : "text-[#A8B0C2]"
                                    }`}>
                                        {periodComparison.scoreDelta > 0 ? "↑" : periodComparison.scoreDelta < 0 ? "↓" : "→"}{" "}
                                        {periodComparison.scoreDelta > 0 ? "+" : ""}{periodComparison.scoreDelta} avg
                                    </p>
                                </div>
                            )}
                        </section>
                    </FadeIn>
                )}

                {/* Monthly Comparison — scoreboard instruments */}
                <FadeInStagger triggerOnView={false}>
                    <dl className="grid gap-x-8 gap-y-5 border-b border-white/[0.06] pb-6 sm:grid-cols-3">
                        {[
                            { label: "Interviews", current: monthlyComparison[0].interviews, prev: monthlyComparison[1].interviews, suffix: "" },
                            { label: "Avg Score", current: monthlyComparison[0].avgScore, prev: monthlyComparison[1].avgScore, suffix: "/100" },
                            { label: "Hours Practiced", current: monthlyComparison[0].hours, prev: monthlyComparison[1].hours, suffix: "h" },
                        ].map((stat) => {
                            const diff = stat.current - stat.prev;
                            const pct = stat.prev > 0 ? Math.round((diff / stat.prev) * 100) : 0;
                            return (
                                <FadeInStaggerItem key={stat.label}>
                                    <dt className="text-[12px] text-[#A8B0C2] lg:text-[13px]">{stat.label}</dt>
                                    <dd className="mt-1 flex items-baseline gap-1 font-mono text-2xl font-medium tracking-tight text-[#F2F4F8] lg:text-3xl">
                                        <span>{stat.current}</span>
                                        {stat.suffix ? (
                                            <span className="text-base font-medium text-[#C5CBD8] lg:text-lg">{stat.suffix}</span>
                                        ) : null}
                                    </dd>
                                    <p className={`mt-1 text-xs font-medium ${diff >= 0 ? "text-emerald-400" : "text-rose-300"}`}>
                                        {diff >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs last month
                                    </p>
                                </FadeInStaggerItem>
                            );
                        })}
                    </dl>
                </FadeInStagger>

                <div className="grid gap-6 lg:grid-cols-2">
                    <PerformanceChart weeklyScores={weeklyScores} delay={0.2} />
                    <CategoryBreakdown categories={categoryBreakdown} delay={0.3} />
                </div>

                {/* Sub-score Breakdown */}
                <FadeIn triggerOnView={false} delay={0.35} direction="up">
                    <section>
                        <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Score Breakdown</h3>
                        <p className="mt-1 mb-5 text-xs text-[#A8B0C2]">Average sub-scores across all evaluated interviews</p>
                        <div className="grid gap-6 sm:grid-cols-3">
                            {[
                                { label: "Communication", value: subScores.communication, description: "Clarity and articulation" },
                                { label: "Technical Depth", value: subScores.technicalDepth, description: "Knowledge and reasoning" },
                                { label: "Clarity", value: subScores.clarity, description: "Structure and logical flow" },
                            ].map(({ label, value, description }) => (
                                <div key={label}>
                                    <p className="text-[12px] text-[#A8B0C2]">{label}</p>
                                    <p className="mt-0.5 mb-3 text-xs text-[#A8B0C2]">{description}</p>
                                    {value !== null ? (
                                        <>
                                            <div className="mb-2 flex items-end justify-between">
                                                <span className="font-mono text-2xl font-medium tracking-tight text-[#F2F4F8]">{value}</span>
                                                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                                    value >= 80 ? "bg-emerald-500/15 text-emerald-300"
                                                    : value >= 65 ? "bg-blue-500/15 text-blue-300"
                                                    : "bg-amber-500/15 text-amber-300"
                                                }`}>
                                                    {value >= 80 ? "Strong" : value >= 65 ? "Steady" : "Improve"}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
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
                                        <p className="text-sm text-[#A8B0C2]">No data yet</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </FadeIn>

                <SubScoreTrendChart trends={weeklySubScoreTrends} delay={0.4} />

                {/* Question Feedback */}
                <FadeIn triggerOnView={false} delay={0.45} direction="up">
                    <section>
                        <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Question Feedback</h3>
                        <p className="mt-1 mb-5 text-xs text-[#A8B0C2]">Questions you rated across all interviews</p>
                        {feedbackStats.total === 0 ? (
                            <p className="py-4 text-sm text-[#A8B0C2]">
                                Rate questions in the Transcript tab to see insights here
                            </p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[#A8B0C2]">{feedbackStats.total} question{feedbackStats.total !== 1 ? "s" : ""} rated</span>
                                    <span className="font-medium text-[#E8ECF4]">
                                        {Math.round((feedbackStats.thumbsUp / feedbackStats.total) * 100)}% positive
                                    </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${Math.round((feedbackStats.thumbsUp / feedbackStats.total) * 100)}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex items-center gap-3">
                                        <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                        <div>
                                            <p className="font-mono text-lg font-medium leading-none text-[#F2F4F8]">{feedbackStats.thumbsUp}</p>
                                            <p className="mt-0.5 text-xs text-[#A8B0C2]">Went well</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <svg className="h-4 w-4 shrink-0 rotate-180 text-rose-300" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                        <div>
                                            <p className="font-mono text-lg font-medium leading-none text-[#F2F4F8]">{feedbackStats.thumbsDown}</p>
                                            <p className="mt-0.5 text-xs text-[#A8B0C2]">Challenging</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </FadeIn>

                {/* Strengths & Weaknesses */}
                <div className="grid gap-8 lg:grid-cols-2">
                    <FadeIn triggerOnView={false} delay={0.4} direction="up">
                        <section>
                            <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Strengths</h3>
                            <p className="mt-1 mb-4 text-xs text-[#A8B0C2]">Keep leveraging these in interviews</p>
                            <div className="space-y-2.5">
                                {strengths.length > 0 ? (
                                    strengths.map((skill, idx) => (
                                        <div key={skill} className="flex items-center gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/10 px-3.5 py-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-xs font-semibold text-emerald-300">{idx + 1}</span>
                                            <span className="text-sm font-medium text-[#E8ECF4]">{skill}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="py-4 text-sm text-[#A8B0C2]">Complete an interview to get insights</p>
                                )}
                            </div>
                        </section>
                    </FadeIn>

                    <FadeIn triggerOnView={false} delay={0.5} direction="up">
                        <section>
                            <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Areas to Improve</h3>
                            <p className="mt-1 mb-4 text-xs text-[#A8B0C2]">Focus areas for your next sessions</p>
                            <div className="space-y-2.5">
                                {improvements.length > 0 ? (
                                    improvements.map((skill, idx) => (
                                        <div key={skill} className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-amber-500/10 px-3.5 py-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-500/15 text-xs font-semibold text-amber-300">{idx + 1}</span>
                                            <span className="text-sm font-medium text-[#E8ECF4]">{skill}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="py-4 text-sm text-[#A8B0C2]">Complete an interview to get insights</p>
                                )}
                            </div>
                        </section>
                    </FadeIn>
                </div>
                </>)}
            </div>
        </>
    );
}
