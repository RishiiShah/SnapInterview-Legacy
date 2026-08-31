"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import type { SubScoreTrendSets, SubScores } from "@/lib/interview/metrics";
import {
  SUB_SCORE_DIMENSIONS,
  scoreToneClass,
  type SubScoreDimensionKey,
} from "@/lib/interview/sub-score-dimensions";

type TrendRange = "daily" | "weekly" | "monthly";

type DimensionAnalyticsProps = {
  subScores: SubScores;
  subScoreTrends: SubScoreTrendSets;
};

const RANGE_HINT: Record<TrendRange, string> = {
  daily: "Last 14 days",
  weekly: "Last 8 weeks",
  monthly: "Last 6 months",
};

const TREND_COLORS: Record<SubScoreDimensionKey, string> = {
  communication: "bg-[#3B82F6]/70 group-hover:bg-[#3B82F6]",
  technicalDepth: "bg-cyan-400/70 group-hover:bg-cyan-400",
  clarity: "bg-teal-400/70 group-hover:bg-teal-400",
};

const EMPTY_SUB_SCORE_TRENDS: SubScoreTrendSets = {
  daily: { communication: [], technicalDepth: [], clarity: [] },
  weekly: { communication: [], technicalDepth: [], clarity: [] },
  monthly: { communication: [], technicalDepth: [], clarity: [] },
};

export default function DimensionAnalytics({
  subScores,
  subScoreTrends = EMPTY_SUB_SCORE_TRENDS,
}: DimensionAnalyticsProps) {
  const [range, setRange] = useState<TrendRange>("daily");

  const trends = useMemo(() => {
    switch (range) {
      case "weekly":
        return subScoreTrends.weekly;
      case "monthly":
        return subScoreTrends.monthly;
      default:
        return subScoreTrends.daily;
    }
  }, [range, subScoreTrends]);

  const hasAnySubScore = SUB_SCORE_DIMENSIONS.some(({ key }) => subScores[key] != null);

  return (
    <section className="border-t border-white/[0.06] pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
            Rubric dimensions
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[#A8B0C2]">
            Three scores from your AI evaluation—each out of 100. Averages across mocks that include
            rubric data.
          </p>
        </div>
      </div>

      <div>
        <dl className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {SUB_SCORE_DIMENSIONS.map(({ key, label, summary, barClass }) => {
            const value = subScores[key];
            return (
              <div key={key}>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <dt className="text-sm font-medium text-[#E8ECF4]">{label}</dt>
                  <p className="mt-1 text-xs leading-relaxed text-[#A8B0C2]">{summary}</p>
                  {value !== null ? (
                    <>
                      <dd
                        className={`mt-4 flex items-baseline gap-1 font-mono text-3xl font-medium tracking-tight ${scoreToneClass(value)}`}
                      >
                        {value}
                        <span className="text-base font-medium text-[#C5CBD8]">/100</span>
                      </dd>
                      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <dd className="mt-4 text-sm text-[#A8B0C2]">
                      {hasAnySubScore ? "Not scored on recent mocks" : "Shows up after your first evaluated mock"}
                    </dd>
                  )}
                </div>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg tracking-tight text-[#F2F4F8]">Trends by dimension</h3>
            <p className="mt-1 text-xs text-[#B8C0CE]">{RANGE_HINT[range]}</p>
          </div>
          <div className="flex rounded-lg border border-white/[0.08] p-0.5">
            {(["daily", "weekly", "monthly"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  range === key
                    ? "bg-white/[0.08] text-[#F2F4F8]"
                    : "text-[#A8B0C2] hover:text-[#E8ECF4]"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {SUB_SCORE_DIMENSIONS.map(({ key, label }, seriesIndex) => {
            const data = trends[key];
            const hasData = data.some((point) => point.value > 0);
            return (
              <div key={key} className="min-w-0 rounded-xl border border-white/[0.05] bg-white/[0.01] p-4">
                <p className="mb-3 text-[13px] font-medium text-[#C5CBD8]">{label}</p>
                {hasData ? (
                  <div className="flex h-28 items-end gap-1 overflow-x-auto">
                    {data.map((point, i) => (
                      <div
                        key={`${point.label}-${i}`}
                        className="group flex h-full min-w-[1.5rem] flex-1 flex-col items-center justify-end gap-1"
                      >
                        <div className="relative flex w-full flex-1 items-end">
                          {point.value > 0 ? (
                            <motion.div
                              className={`relative w-full origin-bottom rounded-sm transition-colors ${TREND_COLORS[key]}`}
                              initial={{ height: "0%" }}
                              animate={{
                                height: `${Math.min(100, Math.max(6, point.value * 1.12))}%`,
                              }}
                              transition={{
                                duration: 0.65,
                                delay: 0.1 + seriesIndex * 0.04 + i * 0.03,
                                ease: [0.21, 0.47, 0.32, 0.98],
                              }}
                            >
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-[#C5CBD8] opacity-0 transition-opacity group-hover:opacity-100">
                                {point.value}
                              </span>
                            </motion.div>
                          ) : (
                            <div className="h-[3px] w-full rounded-sm bg-white/[0.04]" aria-hidden />
                          )}
                        </div>
                        <span className="w-full truncate text-center text-[9px] text-[#A8B0C2] sm:text-[10px]">
                          {point.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-xs text-[#A8B0C2]">No rubric data in this range yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
