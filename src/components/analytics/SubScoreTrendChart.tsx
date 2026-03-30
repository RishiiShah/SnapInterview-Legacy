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
      className="rounded-2xl border border-zinc-200 bg-white p-[18px]"
    >
      <h3 className="mb-1 text-sm font-semibold text-zinc-900">Sub-score Trends</h3>
      <p className="mb-4 text-xs text-zinc-400">Weekly breakdown by dimension</p>
      <div className="grid grid-cols-3 gap-4">
        {SUB_SCORES.map(({ key, label, color }, seriesIndex) => {
          const data = trends[key];
          const hasData = data.some((d) => d.value > 0);
          return (
            <div key={key}>
              <p className="mb-2 text-[11px] font-medium text-zinc-500">{label}</p>
              {hasData ? (
                <div className="flex h-[80px] items-end gap-1">
                  {data.map((d, i) => (
                    <div
                      key={d.label}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
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
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                              {d.value}
                            </span>
                          )}
                        </motion.div>
                      </div>
                      <span className="text-[9px] text-zinc-400">{d.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[80px] items-center justify-center rounded-lg border border-dashed border-zinc-100">
                  <p className="text-[10px] text-zinc-400 italic">No data yet</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FadeIn>
  );
}
