"use client";

import { SendActionButton } from "@/components/ui/SendActionButton";

interface SubmitButtonProps {
  loading: boolean;
  text: string;
  sentText?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function SubmitButton({
  loading,
  text,
  sentText = "Sent",
  disabled = false,
  onClick,
}: SubmitButtonProps) {
  return (
    <SendActionButton
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      label={text}
      sentLabel={sentText}
      loading={loading}
      disabled={loading || disabled}
      fullWidth
    />
  );
}
