"use client";

import { ClipButton } from "@/components/ui/ClipButton";
import { IconSpinner } from "@/components/ui/icons";

interface SubmitButtonProps {
  loading: boolean;
  text: string;
  disabled?: boolean;
  onClick?: () => void;
}

/** Auth primary CTA — framed clip button (Tailwind). */
export function SubmitButton({
  loading,
  text,
  disabled = false,
  onClick,
}: SubmitButtonProps) {
  return (
    <ClipButton
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      loading={loading}
      disabled={loading || disabled}
      fullWidth
      className="mt-1"
    >
      {loading ? <IconSpinner className="mx-auto h-4 w-4 animate-spin" /> : text}
    </ClipButton>
  );
}
