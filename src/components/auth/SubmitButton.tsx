"use client";

import { IconSpinner } from "@/components/ui/icons";

interface SubmitButtonProps {
  loading: boolean;
  text: string;
  disabled?: boolean;
  onClick?: () => void;
}

/** Matches landing primary CTA: h-12, rounded-xl, blue-600. */
export function SubmitButton({
  loading,
  text,
  disabled = false,
  onClick,
}: SubmitButtonProps) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#2563EB] px-6 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-blue-600/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {loading ? (
        <IconSpinner className="h-5 w-5 animate-spin text-white" />
      ) : (
        text
      )}
    </button>
  );
}
