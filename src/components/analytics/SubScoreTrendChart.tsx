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
    color: "bg-blue-400/80 group-hover:bg-blue-400",
  },
  {
    key: "technicalDepth" as const,
    label: "Technical Depth",
    color: "bg-cyan-400/80 group-hover:bg-cyan-400",
  },
  {
    key: "clarity" as const,
    label: "Clarity",
    color: "bg-teal-400/80 group-hover:bg-teal-400",
  },
] as const;

export default function SubScoreTrendChart({ trends, delay = 0.4 }: SubScoreTrendChartProps) {
  return (
    <FadeIn
      triggerOnView={false}
      delay={delay}
      direction="up"
    >
      <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Sub-score Trends</h3>
      <p className="mt-1 mb-5 text-xs text-[#A8B0C2]">Weekly breakdown by dimension</p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4">
        {SUB_SCORES.map(({ key, label, color }, seriesIndex) => {
          const data = trends[key];
          const hasData = data.some((d) => d.value > 0);
          return (
            <div
              key={key}
              className="min-w-0 border-b border-white/[0.06] pb-6 last:border-b-0 last:pb-0 md:border-b-0 md:pb-0"
            >
              <p className="mb-2 text-xs font-medium text-[#A8B0C2] md:text-[11px]">{label}</p>
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
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-medium text-[#C5CBD8] opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                              {d.value}
                            </span>
                          )}
                        </motion.div>
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-[#A8B0C2] md:text-[9px]">
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-24 items-center md:h-20">
                  <p className="text-xs text-[#A8B0C2] md:text-[10px]">No data yet</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FadeIn>
  );
}
