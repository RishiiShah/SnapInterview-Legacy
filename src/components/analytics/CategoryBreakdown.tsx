"use client";

import { FadeIn } from "@/components/ui/motion";

type CategoryScore = {
  category: string;
  score: number;
};

type CategoryBreakdownProps = {
  categories: CategoryScore[];
  delay?: number;
};

export default function CategoryBreakdown({ categories, delay = 0.3 }: CategoryBreakdownProps) {
  return (
    <FadeIn triggerOnView={false} delay={delay} direction="up">
      <h3 className="font-display text-lg tracking-tight text-[#F2F4F8] sm:text-xl">Category Breakdown</h3>
      <p className="mt-1 mb-4 text-xs text-[#A8B0C2]">Performance by interview dimension</p>
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.category}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-[#E8ECF4]">{cat.category}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-[#F2F4F8]">{cat.score}%</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    cat.score >= 80
                      ? "bg-emerald-500/15 text-emerald-300"
                      : cat.score >= 70
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {cat.score >= 80 ? "Strong" : cat.score >= 70 ? "Steady" : "Improve"}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cat.score >= 80
                    ? "bg-emerald-500"
                    : cat.score >= 70
                      ? "bg-blue-500"
                      : "bg-amber-500"
                }`}
                style={{ width: `${cat.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
