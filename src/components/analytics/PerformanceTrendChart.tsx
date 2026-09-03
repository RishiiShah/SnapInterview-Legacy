"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import type { AnalyticsTrendPoint } from "@/lib/interview/metrics";

type TrendRange = "daily" | "weekly" | "monthly";

type PerformanceTrendChartProps = {
  dailyTrend: AnalyticsTrendPoint[];
  weeklyTrend: AnalyticsTrendPoint[];
  monthlyTrend: AnalyticsTrendPoint[];
};

const RANGE_META: Record<TrendRange, { title: string; hint: string }> = {
  daily: {
    title: "Daily scores",
    hint: "Last 14 days · average when you ran multiple mocks the same day",
  },
  weekly: {
    title: "Weekly scores",
    hint: "Last 8 weeks · Monday–Sunday buckets",
  },
  monthly: {
    title: "Monthly scores",
    hint: "Last 6 calendar months",
  },
};

export default function PerformanceTrendChart({
  dailyTrend = [],
  weeklyTrend = [],
  monthlyTrend = [],
}: PerformanceTrendChartProps) {
  const [range, setRange] = useState<TrendRange>("daily");

  const points = useMemo(() => {
    switch (range) {
      case "weekly":
        return weeklyTrend;
      case "monthly":
        return monthlyTrend;
      default:
        return dailyTrend;
    }
  }, [dailyTrend, monthlyTrend, range, weeklyTrend]);

  const activePoints = points.filter((p) => p.sessionCount > 0 && p.avgScore != null);
  const meta = RANGE_META[range];

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">{meta.title}</h2>
          <p className="mt-1 text-xs text-[#B8C0CE]">{meta.hint}</p>
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

      {activePoints.length === 0 ? (
        <p className="min-h-[150px] py-8 text-sm text-[#A8B0C2]">
          No scored interviews in this range yet. Complete a mock to see your trend.
        </p>
      ) : (
        <div className="mt-1 flex min-h-[160px] items-end gap-1.5 overflow-x-auto pt-2.5 sm:gap-2">
          {points.map((point, i) => {
            const score = point.avgScore;
            const hasData = point.sessionCount > 0 && score != null;
            return (
              <div
                key={`${point.label}-${i}`}
                className="group flex h-full min-w-[2.25rem] flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="relative flex w-full flex-1 items-end">
                  {hasData ? (
                    <motion.div
                      className="relative w-full origin-bottom rounded-sm bg-white/[0.08] transition-colors group-hover:bg-[#3B82F6]"
                      initial={{ height: "0%" }}
                      animate={{ height: `${Math.min(100, Math.max(6, score * 1.12))}%` }}
                      transition={{
                        duration: 0.7,
                        delay: 0.15 + i * 0.04,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                    >
                      <span className="absolute -top-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="font-mono text-[11px] font-medium tabular-nums text-[#E8ECF4]">
                          {score}
                        </span>
                        {point.sessionCount > 1 ? (
                          <span className="text-[9px] text-[#A8B0C2]">{point.sessionCount} runs</span>
                        ) : null}
                      </span>
                    </motion.div>
                  ) : (
                    <div className="h-[3px] w-full rounded-sm bg-white/[0.04]" aria-hidden />
                  )}
                </div>
                <span className="max-w-full truncate text-center text-[9px] text-[#A8B0C2] sm:text-[10px]">
                  {point.label}
                </span>
                {point.sessionCount > 1 ? (
                  <span className="font-mono text-[9px] tabular-nums text-[#93C5FD]">{point.sessionCount}×</span>
                ) : (
                  <span className="h-[12px]" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
