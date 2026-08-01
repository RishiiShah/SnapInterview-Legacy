"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/motion";
import type { WeeklySubScoreTrends } from "@/lib/interview/metrics";

type SubScoreTrendChartProps = {
  trends: WeeklySubScoreTrends;
  delay?: number;
};

const SUB_SCORES = [
  {
    key: "communication" as const,
    label: "Communication",
    color: "bg-blue-400 group-hover:bg-blue-600",
  },
  {
    key: "technicalDepth" as const,
    label: "Technical Depth",
    color: "bg-violet-400 group-hover:bg-violet-600",
  },
  {
    key: "clarity" as const,
    label: "Clarity",
    color: "bg-emerald-400 group-hover:bg-emerald-600",
  },
] as const;

export default function SubScoreTrendChart({ trends, delay = 0.4 }: SubScoreTrendChartProps) {
  return (
    <FadeIn
      triggerOnView={false}
      delay={delay}
      direction="up"
      className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6"
    >
      <h3 className="mb-1 text-sm font-semibold text-zinc-900">Sub-score Trends</h3>
      <p className="mb-4 text-xs text-zinc-600 md:mb-5">Weekly breakdown by dimension</p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4">
        {SUB_SCORES.map(({ key, label, color }, seriesIndex) => {
          const data = trends[key];
          const hasData = data.some((d) => d.value > 0);
          return (
            <div
              key={key}
              className="min-w-0 border-b border-zinc-100 pb-6 last:border-b-0 last:pb-0 md:border-b-0 md:pb-0"
            >
              <p className="mb-2 text-xs font-medium text-zinc-600 md:text-[11px]">{label}</p>
              {hasData ? (
                <div className="flex h-24 items-end gap-1.5 md:h-20 md:gap-1">
                  {data.map((d, i) => (
                    <div
                      key={d.label}
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    >
                      <div className="relative flex w-full flex-1 items-end">
                        <motion.div
                          className={`relative w-full origin-bottom rounded-sm transition-colors ${color}`}
                          initial={{ height: "0%" }}
                          animate={{
                            height: `${Math.min(100, Math.max(d.value > 0 ? 6 : 0, d.value * 1.15))}%`,
                          }}
                          transition={{
                            duration: 0.7,
                            delay: delay + 0.2 + seriesIndex * 0.05 + i * 0.06,
                            ease: [0.21, 0.47, 0.32, 0.98],
                          }}
                        >
                          {d.value > 0 && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-zinc-600 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                              {d.value}
                            </span>
                          )}
                        </motion.div>
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-zinc-600 md:text-[9px]">
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-100 md:h-20">
                  <p className="text-xs text-zinc-600 italic md:text-[10px]">No data yet</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FadeIn>
  );
}
