"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/motion";

type WeeklyScore = {
  label: string;
  value: number;
};

type PerformanceChartProps = {
  weeklyScores: WeeklyScore[];
  delay?: number;
};

export default function PerformanceChart({ weeklyScores, delay = 0.2 }: PerformanceChartProps) {
  return (
    <FadeIn triggerOnView={false} delay={delay} direction="up" className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-[18px]">
      <h3 className="mb-1 text-sm font-semibold text-zinc-900">Weekly Performance</h3>
      <p className="mb-1.5 text-xs text-zinc-600">Score trend this week</p>
      <div className="mt-1 flex min-h-[150px] flex-1 items-end gap-2.5 pt-2.5">
        {weeklyScores.map((d, i) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex w-full flex-1 items-end">
              <motion.div
                className="relative w-full origin-bottom rounded-md bg-zinc-200 transition-colors group-hover:bg-zinc-900"
                initial={{ height: "0%" }}
                animate={{ height: `${Math.min(100, Math.max(4, d.value * 1.15))}%` }}
                transition={{
                  duration: 0.8,
                  delay: 0.4 + i * 0.1,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
              >
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-medium text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                  {d.value}
                </span>
              </motion.div>
            </div>
            <span className="text-[10px] text-zinc-600">{d.label}</span>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
