"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SendActionButton } from "@/components/ui/SendActionButton";
import { AUTH_EASE } from "./AuthShell";

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
  const reducedMotion = useReducedMotion() ?? false;
  const activeLabel =
    sentText ??
    (text === "Log in"
      ? "Logging in..."
      : text === "Create account"
        ? "Creating account..."
        : "Processing...");

  return (
    <motion.div
      whileHover={reducedMotion || loading || disabled ? undefined : { scale: 1.012 }}
      whileTap={reducedMotion || loading || disabled ? undefined : { scale: 0.988 }}
      transition={{ duration: 0.2, ease: AUTH_EASE }}
      className="w-full"
    >
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
    </motion.div>
  );
}
