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

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 70) return "text-amber-300";
  return "text-[#C5CBD8]";
}

export default function CategoryBreakdown({ categories, delay = 0.3 }: CategoryBreakdownProps) {
  return (
    <FadeIn triggerOnView={false} delay={delay} direction="up">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8] sm:text-2xl">
          By category
        </h2>
        <p className="text-xs text-[#B8C0CE]">Interview dimensions</p>
      </div>
      <div className="space-y-5">
        {categories.length === 0 ? (
          <p className="text-sm text-[#A8B0C2]">No category data yet</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.category}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#E8ECF4]">{cat.category}</span>
                <span className={`font-mono text-sm tabular-nums ${scoreTone(cat.score)}`}>
                  {cat.score}
                </span>
              </div>
              <div className="h-px w-full bg-white/[0.06]">
                <div
                  className="h-px bg-[#3B82F6]/75 transition-all duration-500"
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </FadeIn>
  );
}
