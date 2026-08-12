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
  iconColor = "text-[#60A5FA]",
  compact = false,
}: ChoiceCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative flex cursor-pointer items-center gap-3.5 rounded-lg border text-left transition-colors duration-200 ${
        compact ? "p-3" : "flex-col items-start gap-3 p-4"
      } ${
        selected
          ? "border-[#3B82F6]/50 bg-[#3B82F6]/10"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
      }`}
    >
      {icon ? (
        <div
          className={`flex items-center justify-center rounded-md transition-colors duration-200 ${
            compact ? "h-9 w-9 shrink-0" : "h-11 w-11"
          } ${
            selected
              ? "bg-[#3B82F6] text-white"
              : `bg-white/[0.05] ${iconColor}`
          }`}
        >
          {icon}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <h3
          className={`font-medium transition-colors ${
            compact ? "text-xs" : "text-sm"
          } ${selected ? "text-[#F2F4F8]" : "text-[#E8ECF4]"}`}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={`mt-0.5 text-[11px] leading-relaxed transition-colors ${
              selected ? "text-[#B8C0CE]" : "text-[#A8B0C2]"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>

      {selected ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] text-white"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      ) : null}
    </motion.button>
  );
}
