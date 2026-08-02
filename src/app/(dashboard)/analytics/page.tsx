import Link from "next/link";
import { redirect } from "next/navigation";

import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import PerformanceChart from "@/components/analytics/PerformanceChart";
import CategoryBreakdown from "@/components/analytics/CategoryBreakdown";
import SubScoreTrendChart from "@/components/analytics/SubScoreTrendChart";
import { getAnalyticsOverviewData } from "@/lib/interview/metrics";
import { getServerAuthSession } from "@/lib/server-auth";

function scoreTone(value: number | null): string {
  if (value == null) return "text-[#A8B0C2]";
  if (value >= 80) return "text-emerald-400";
  if (value >= 70) return "text-amber-300";
  return "text-rose-300";
}

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
  const signalValue = periodComparison.currentAvg;
  const thisMonth = monthlyComparison[0];
  const lastMonth = monthlyComparison[1];

  return (
    <div className="mx-auto max-w-7xl space-y-11 pb-16 pt-2 xl:max-w-[88rem]">
      <SlideIn>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#F2F4F8] sm:text-[2.35rem]">
              Analytics
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#A8B0C2]">
              Scores, dimensions, and momentum across your practice.
            </p>
          </div>
          <Link
            href="/recordings"
            className="cursor-pointer text-sm text-[#A8B0C2] transition-colors hover:text-[#C5CBD8]"
          >
            View recordings →
          </Link>
        </header>
      </SlideIn>

      {!hasData ? (
        <FadeIn triggerOnView={false} direction="up">
          <section className="py-16 text-center">
            <p className="font-display text-xl tracking-tight text-[#E8ECF4]">No interview data yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#A8B0C2]">
              Complete a mock interview to unlock performance analytics.
            </p>
            <Link
              href="/practice"
              className="mt-6 inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
            >
              Start an interview
            </Link>
          </section>
        </FadeIn>
      ) : (
        <>
          {/* Hero signal + instruments */}
          <FadeIn triggerOnView={false} direction="up">
            <section className="py-1">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
                <div className="min-w-0">
                  {signalValue != null ? (
                    <>
                      <p className="text-[13px] text-[#B8C0CE] lg:text-sm">30-day average</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-5xl font-medium tracking-tight text-[#F2F4F8] sm:text-6xl lg:text-7xl">
                          {signalValue}
                        </span>
                        <span className="font-mono text-lg font-medium text-[#B8C0CE] lg:text-xl">/100</span>
                      </div>
                      {periodComparison.scoreDelta !== null ? (
                        <p
                          className={`mt-2 text-sm ${
                            periodComparison.scoreDelta > 0
                              ? "text-emerald-400"
                              : periodComparison.scoreDelta < 0
                                ? "text-rose-300"
                                : "text-[#A8B0C2]"
                          }`}
                        >
                          {periodComparison.scoreDelta > 0 ? "↑" : periodComparison.scoreDelta < 0 ? "↓" : "→"}{" "}
                          {periodComparison.scoreDelta > 0 ? "+" : ""}
                          {periodComparison.scoreDelta} vs prior 30 days
                          {periodComparison.previousAvg != null
                            ? ` (${periodComparison.previousAvg})`
                            : ""}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-[#C5CBD8]">{periodComparison.summary}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] text-[#B8C0CE] lg:text-sm">Last 30 days</p>
                      <p className="mt-2 text-[15px] text-[#E8ECF4]">{periodComparison.summary}</p>
                    </>
                  )}
                </div>

                <dl className="grid grid-cols-3 gap-x-8 gap-y-5 lg:gap-x-12">
                  {[
                    {
                      label: "Interviews",
                      current: thisMonth.interviews,
                      prev: lastMonth.interviews,
                      suffix: "",
                    },
                    {
                      label: "Avg score",
                      current: thisMonth.avgScore,
                      prev: lastMonth.avgScore,
                      suffix: "/100",
                    },
                    {
                      label: "Hours",
                      current: thisMonth.hours,
                      prev: lastMonth.hours,
                      suffix: "h",
                    },
                  ].map((stat) => {
                    const diff = stat.current - stat.prev;
                    const pct = stat.prev > 0 ? Math.round((diff / stat.prev) * 100) : 0;
                    return (
                      <div key={stat.label}>
                        <dt className="text-[12px] text-[#B8C0CE] lg:text-[13px]">{stat.label}</dt>
                        <dd className="mt-1 flex items-baseline gap-1 font-mono text-xl font-medium tracking-tight text-[#F2F4F8] lg:text-2xl">
                          <span>{stat.current}</span>
                          {stat.suffix ? (
                            <span className="text-base font-medium text-[#C5CBD8] lg:text-lg">
                              {stat.suffix}
                            </span>
                          ) : null}
                        </dd>
                        <p
                          className={`mt-1 text-xs ${diff >= 0 ? "text-emerald-400" : "text-rose-300"}`}
                        >
                          {diff >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs last month
                        </p>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </section>
          </FadeIn>

          {/* Charts — no card chrome */}
          <div className="grid gap-10 border-t border-white/[0.06] pt-10 lg:grid-cols-2 lg:gap-14">
            <PerformanceChart weeklyScores={weeklyScores} delay={0.08} />
            <CategoryBreakdown categories={categoryBreakdown} delay={0.12} />
          </div>

          {/* Sub-score instruments */}
          <FadeIn triggerOnView={false} delay={0.16} direction="up">
            <section className="border-t border-white/[0.06] pt-10">
              <div className="mb-6 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
                  Score breakdown
                </h2>
                <p className="text-xs text-[#B8C0CE]">Across evaluated interviews</p>
              </div>
              <FadeInStagger triggerOnView={false}>
                <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
                  {[
                    {
                      label: "Communication",
                      value: subScores.communication,
                      description: "Clarity and articulation",
                    },
                    {
                      label: "Technical depth",
                      value: subScores.technicalDepth,
                      description: "Knowledge and reasoning",
                    },
                    {
                      label: "Clarity",
                      value: subScores.clarity,
                      description: "Structure and logical flow",
                    },
                  ].map(({ label, value, description }) => (
                    <FadeInStaggerItem key={label}>
                      <dt className="text-[12px] text-[#B8C0CE] lg:text-[13px]">{label}</dt>
                      <p className="mt-0.5 text-xs text-[#A8B0C2]">{description}</p>
                      {value !== null ? (
                        <>
                          <dd
                            className={`mt-2 font-mono text-3xl font-medium tracking-tight ${scoreTone(value)}`}
                          >
                            {value}
                          </dd>
                          <div className="mt-3 h-px w-full bg-white/[0.06]">
                            <div
                              className="h-px bg-[#3B82F6]/80 transition-all duration-500"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <dd className="mt-2 text-sm text-[#A8B0C2]">—</dd>
                      )}
                    </FadeInStaggerItem>
                  ))}
                </dl>
              </FadeInStagger>
            </section>
          </FadeIn>

          <div className="border-t border-white/[0.06] pt-10">
            <SubScoreTrendChart trends={weeklySubScoreTrends} delay={0.2} />
          </div>

          {/* Question feedback */}
          <FadeIn triggerOnView={false} delay={0.24} direction="up">
            <section className="border-t border-white/[0.06] pt-10">
              <div className="mb-6 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
                  Question feedback
                </h2>
                <p className="text-xs text-[#B8C0CE]">From transcript ratings</p>
              </div>
              {feedbackStats.total === 0 ? (
                <p className="text-sm text-[#A8B0C2]">
                  Rate questions in a recording transcript to see insights here.
                </p>
              ) : (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[12px] text-[#B8C0CE]">Positive</p>
                    <p className="mt-1 font-mono text-3xl font-medium tracking-tight text-[#F2F4F8]">
                      {Math.round((feedbackStats.thumbsUp / feedbackStats.total) * 100)}
                      <span className="text-lg text-[#C5CBD8]">%</span>
                    </p>
                    <p className="mt-1 text-sm text-[#A8B0C2]">
                      {feedbackStats.total} question{feedbackStats.total !== 1 ? "s" : ""} rated
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-10">
                    <div>
                      <dt className="text-[12px] text-[#B8C0CE]">Went well</dt>
                      <dd className="mt-1 font-mono text-xl font-medium text-emerald-400">
                        {feedbackStats.thumbsUp}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[12px] text-[#B8C0CE]">Challenging</dt>
                      <dd className="mt-1 font-mono text-xl font-medium text-rose-300">
                        {feedbackStats.thumbsDown}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          </FadeIn>

          {/* Strengths & focus — quiet recommendations style */}
          <FadeIn triggerOnView={false} delay={0.28} direction="up">
            <section className="border-t border-white/[0.06] pt-10">
              <div className="mb-6 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
                  Recommendations
                </h2>
                <p className="text-xs text-[#B8C0CE]">From your evaluations</p>
              </div>
              <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                <div>
                  <p className="text-[12px] text-[#A8B0C2]">Keep leaning on</p>
                  {strengths.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {strengths.map((skill) => (
                        <li key={skill} className="text-[15px] leading-snug text-[#E8ECF4]">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[#A8B0C2]">Complete an interview to get insights</p>
                  )}
                </div>
                <div>
                  <p className="text-[12px] text-[#A8B0C2]">Focus next</p>
                  {improvements.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {improvements.map((skill) => (
                        <li key={skill} className="text-[15px] leading-snug text-[#E8ECF4]">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[#A8B0C2]">Complete an interview to get insights</p>
                  )}
                  {improvements.length > 0 ? (
                    <Link
                      href="/practice"
                      className="mt-4 inline-flex cursor-pointer text-sm text-[#60A5FA] transition-colors hover:text-[#93C5FD]"
                    >
                      Practice this →
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          </FadeIn>
        </>
      )}
    </div>
  );
}
