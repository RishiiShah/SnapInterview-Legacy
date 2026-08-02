"use client";

import { SendActionButton } from "@/components/ui/SendActionButton";

interface SubmitButtonProps {
  loading: boolean;
  success?: boolean;
  text: string;
  sentText?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function SubmitButton({
  loading,
  success,
  text,
  sentText,
  disabled = false,
  onClick,
}: SubmitButtonProps) {
  const activeLabel =
    sentText ??
    (text === "Log in"
      ? "Logging in..."
      : text === "Create account"
        ? "Creating account..."
        : "Processing...");

  return (
    <SendActionButton
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      label={text}
      loadingLabel={activeLabel}
      sentLabel={activeLabel}
      loading={loading}
      success={success}
      disabled={loading || disabled}
      fullWidth
    />
  );
}
