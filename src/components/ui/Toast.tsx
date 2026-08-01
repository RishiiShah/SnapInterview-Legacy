"use client";

import { useEffect } from "react";
import { IconSpinner, IconCheckCircle, IconXMark } from "@/components/ui/icons";

type ToastVariant = "spinner" | "success" | "error";

type ToastProps = {
  variant: ToastVariant;
  message: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
};

export default function Toast({ variant, message, onDismiss, autoDismissMs }: ToastProps) {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg">
      {variant === "spinner" && <IconSpinner className="h-5 w-5 animate-spin text-sky-600" />}
      {variant === "success" && <IconCheckCircle className="h-5 w-5 text-emerald-600" />}
      {variant === "error" && <IconXMark className="h-5 w-5 text-red-600" />}
      <span className="text-sm font-medium text-zinc-800">{message}</span>
    </div>
  );
}
