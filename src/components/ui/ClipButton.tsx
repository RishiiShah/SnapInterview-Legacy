"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ClipButtonProps = {
  children: ReactNode;
  loading?: boolean;
  /** Slide accent — brand blue (Uiverse demo used red). */
  accentClassName?: string;
  fullWidth?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Framed clip button (Uiverse / Valorant-style) in Tailwind.
 * Hover: skewed blue fill sweeps across; corner tick turns white.
 */
export function ClipButton({
  children,
  loading = false,
  disabled,
  className = "",
  accentClassName = "bg-[#3B82F6]",
  fullWidth = false,
  type = "button",
  ...props
}: ClipButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "group/clip relative appearance-none border-none bg-transparent p-2",
        "cursor-pointer text-[14px] font-bold uppercase tracking-[0.04em]",
        "transition-all duration-150 ease-out",
        "focus:outline-none active:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        fullWidth ? "block w-full" : "inline-block",
        className,
      ].join(" ")}
      {...props}
    >
      {/* Outer frame — top half */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(50%-5px)] border border-b-0 border-[#7D8082] transition-all duration-150 ease-out group-active/clip:inset-x-[3px] group-active/clip:top-[3px]"
      />
      {/* Outer frame — bottom half */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(50%-5px)] border border-t-0 border-[#7D8082] transition-all duration-150 ease-out group-active/clip:inset-x-[3px] group-active/clip:bottom-[3px]"
      />

      <span
        className={[
          "relative block overflow-hidden bg-[#0f1923] px-5 py-2.5 text-white",
          "shadow-[inset_0_0_0_1px_transparent]",
          fullWidth ? "w-full text-center" : "",
        ].join(" ")}
      >
        {/* Skewed hover fill — expands to full width (blue, not red) */}
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute top-0 -bottom-px -left-2 z-0 w-0 -skew-x-[15deg]",
            "transition-[width] duration-200 ease-out",
            "group-hover/clip:w-[calc(100%+15px)]",
            "group-disabled/clip:group-hover/clip:w-0",
            accentClassName,
          ].join(" ")}
        />

        {/* Top-left tick */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-[1] h-0.5 w-0.5 bg-[#0f1923]"
        />
        {/* Bottom-right tick → white on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 z-[1] h-1 w-1 bg-[#0f1923] transition-colors duration-200 group-hover/clip:bg-white group-disabled/clip:group-hover/clip:bg-[#0f1923]"
        />

        <span className="relative z-10">{children}</span>
      </span>
    </button>
  );
}
