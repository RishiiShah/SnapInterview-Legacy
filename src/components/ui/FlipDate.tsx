"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type FlipDateProps = {
  date?: Date;
  className?: string;
  size?: "md" | "lg";
};

function FlipCard({
  digit,
  animate,
  size,
}: {
  digit: string;
  animate: boolean;
  size: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border border-black/40 bg-[#14161e] shadow-[0_10px_24px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] [transform-style:preserve-3d]",
        large ? "h-[4.5rem] w-[3.15rem] sm:h-[5.25rem] sm:w-[3.6rem]" : "h-14 w-10",
        animate && "origin-center animate-[flipIn_0.6s_cubic-bezier(0.22,1,0.36,1)]",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 flex h-1/2 items-end justify-center overflow-hidden bg-gradient-to-b from-[#1c1f2a] to-[#151820]">
        <span
          className={cn(
            "translate-y-1/2 font-mono font-medium leading-none tracking-tight text-[#F4F6FB]",
            large ? "text-[2.35rem] sm:text-[2.75rem]" : "text-[1.75rem]",
          )}
        >
          {digit}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-start justify-center overflow-hidden bg-gradient-to-b from-[#10131a] to-[#0a0c11]">
        <span
          className={cn(
            "-translate-y-1/2 font-mono font-medium leading-none tracking-tight text-[#D7DCE8]",
            large ? "text-[2.35rem] sm:text-[2.75rem]" : "text-[1.75rem]",
          )}
        >
          {digit}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px -translate-y-px bg-black/80" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
    </div>
  );
}

/**
 * Split-flap calendar day — the dashboard's signature object.
 * Interview day has a clock; this is that object, quiet and physical.
 */
export function FlipDate({ date, className, size = "md" }: FlipDateProps) {
  const [clockNow, setClockNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const now = date ?? clockNow;

  useEffect(() => {
    if (date) return;
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 5, 0);
    const id = window.setTimeout(() => setClockNow(new Date()), tomorrow.getTime() - Date.now());
    return () => window.clearTimeout(id);
  }, [date]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleString("en-US", { month: "short" });
  const weekday = now.toLocaleString("en-US", { weekday: "long" });

  return (
    <div
      className={cn("flex items-end gap-3.5", className)}
      role="img"
      aria-label={`${weekday}, ${month} ${day}`}
    >
      <div className="flex gap-1.5 [perspective:800px]">
        <FlipCard digit={day[0]!} animate={mounted && !reducedMotion} size={size} />
        <FlipCard digit={day[1]!} animate={mounted && !reducedMotion} size={size} />
      </div>
      <div className="min-w-0 pb-0.5 leading-tight">
        <p className="font-display text-lg italic tracking-tight text-[#E8ECF4] sm:text-xl">
          {month}
        </p>
        <p className="mt-0.5 text-sm text-[#A8B0C2]">{weekday}</p>
      </div>
    </div>
  );
}
