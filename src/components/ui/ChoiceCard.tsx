"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ChoiceCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  iconColor?: string;
  compact?: boolean;
}

export function ChoiceCard({
  title,
  description,
  icon,
  selected,
  onClick,
  iconColor = "text-sky-500",
  compact = false,
}: ChoiceCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex cursor-pointer items-center gap-4 rounded-2xl border-2 text-left transition-all duration-300 ${
        compact ? "p-3" : "flex-col items-start gap-3 p-5"
      } ${
        selected
          ? "border-sky-500 bg-sky-50 shadow-lg shadow-sky-500/10"
          : "border-zinc-100 bg-white/50 hover:border-zinc-200 hover:bg-white"
      }`}
    >
      {icon ? (
        <div
          className={`flex items-center justify-center rounded-xl transition-all duration-300 ${
            compact ? "h-10 w-10 shrink-0" : "h-12 w-12"
          } ${
            selected ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : `bg-zinc-50 ${iconColor}`
          }`}
        >
          {icon}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <h3
          className={`font-bold transition-colors ${
             compact ? "text-xs" : "text-sm"
          } ${
            selected ? "text-sky-900" : "text-zinc-900"
          }`}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={`mt-0.5 text-[11px] leading-relaxed transition-colors ${
              selected ? "text-sky-700/70" : "text-zinc-600"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg ring-4 ring-white"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}
