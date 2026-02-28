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
    <FadeIn delay={delay} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-1 text-sm font-semibold text-zinc-900">Category Breakdown</h3>
      <p className="mb-4 text-xs text-zinc-400">Performance by interview dimension</p>
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.category} className="rounded-xl border border-zinc-100 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700">{cat.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">{cat.score}%</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    cat.score >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : cat.score >= 70
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {cat.score >= 80 ? "Strong" : cat.score >= 70 ? "Steady" : "Improve"}
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-100">
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
