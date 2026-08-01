"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ClipButtonProps = {
  children: ReactNode;
  loading?: boolean;
  /** Slide accent — brand blue by default (Valorant demo used red). */
  accentClassName?: string;
  fullWidth?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Framed clip button (Valorant-style) implemented in Tailwind.
 * Outer hairline frame + skew fill on hover. No separate CSS file.
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
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "group relative appearance-none border-none bg-transparent p-2",
        "text-[13px] font-bold uppercase tracking-[0.06em] text-[#0f1923]",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        fullWidth ? "w-full" : "inline-block",
        className,
      ].join(" ")}
      {...props}
    >
      {/* Outer frame — top */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(50%-5px)] border border-b-0 border-[#7D8082] transition-all duration-150 ease-out group-active:inset-x-[3px] group-active:top-[3px] group-disabled:opacity-50"
      />
      {/* Outer frame — bottom */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(50%-5px)] border border-t-0 border-[#7D8082] transition-all duration-150 ease-out group-active:inset-x-[3px] group-active:bottom-[3px] group-disabled:opacity-50"
      />

      <span
        className={[
          "relative block overflow-hidden bg-[#0f1923] px-5 py-2.5 text-white",
          "shadow-[inset_0_0_0_1px_transparent]",
          fullWidth ? "w-full text-center" : "",
        ].join(" ")}
      >
        {/* Skew slide fill */}
        <span
          aria-hidden
          className={[
            "absolute inset-y-0 -left-2 w-0 -skew-x-[15deg] transition-all duration-200 ease-out",
            "group-hover:w-[calc(100%+15px)] group-disabled:group-hover:w-0",
            accentClassName,
          ].join(" ")}
        />

        {/* Corner ticks */}
        <span
          aria-hidden
          className="absolute left-0 top-0 h-0.5 w-0.5 bg-[#0f1923]"
        />
        <span
          aria-hidden
          className="absolute bottom-0 right-0 h-1 w-1 bg-[#0f1923] transition-colors duration-200 group-hover:bg-white group-disabled:group-hover:bg-[#0f1923]"
        />

        <span className="relative z-10">{children}</span>
      </span>
    </button>
  );
}
