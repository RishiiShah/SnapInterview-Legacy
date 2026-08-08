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
    color: "bg-[#3B82F6]/70 group-hover:bg-[#3B82F6]",
  },
  {
    key: "technicalDepth" as const,
    label: "Technical depth",
    color: "bg-cyan-400/70 group-hover:bg-cyan-400",
  },
  {
    key: "clarity" as const,
    label: "Clarity",
    color: "bg-teal-400/70 group-hover:bg-teal-400",
  },
] as const;

export default function SubScoreTrendChart({ trends, delay = 0.4 }: SubScoreTrendChartProps) {
  return (
    <FadeIn triggerOnView={false} delay={delay} direction="up">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
          Sub-score trends
        </h2>
        <p className="text-xs text-[#B8C0CE]">Weekly by dimension</p>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
        {SUB_SCORES.map(({ key, label, color }, seriesIndex) => {
          const data = trends[key];
          const hasData = data.some((d) => d.value > 0);
          return (
            <div key={key} className="min-w-0">
              <p className="mb-3 text-[12px] text-[#B8C0CE]">{label}</p>
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
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-medium tabular-nums text-[#C5CBD8] opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
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
                  <p className="text-xs text-[#A8B0C2]">No data yet</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FadeIn>
  );
}
