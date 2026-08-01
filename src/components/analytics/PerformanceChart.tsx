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
    <FadeIn triggerOnView={false} delay={delay} direction="up" className="flex flex-col">
      <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Weekly Performance</h3>
      <p className="mt-1 mb-1.5 text-xs text-[#A8B0C2]">Score trend this week</p>
      <div className="mt-1 flex min-h-[150px] flex-1 items-end gap-2.5 pt-2.5">
        {weeklyScores.map((d, i) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex w-full flex-1 items-end">
              <motion.div
                className="relative w-full origin-bottom rounded-md bg-white/[0.08] transition-colors group-hover:bg-[#3B82F6]"
                initial={{ height: "0%" }}
                animate={{ height: `${Math.min(100, Math.max(4, d.value * 1.15))}%` }}
                transition={{
                  duration: 0.8,
                  delay: 0.4 + i * 0.1,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
              >
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[11px] font-medium text-[#C5CBD8] opacity-0 transition-opacity group-hover:opacity-100">
                  {d.value}
                </span>
              </motion.div>
            </div>
            <span className="text-[10px] text-[#A8B0C2]">{d.label}</span>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
