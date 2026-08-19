"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  OtpCodeInput,
  type OtpCodeInputHandle,
} from "@/components/auth/OtpCodeInput";
import { IconArrowLeft } from "@/components/ui/icons";
import { useCountdown } from "@/hooks/useCountdown";

interface OtpDialogProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
  onResend: () => Promise<void>;
  /** Inline renders inside AuthShell; modal is the legacy overlay. */
  variant?: "modal" | "inline";
}

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpDialog({
  email,
  onVerified,
  onCancel,
  onResend,
  variant = "modal",
}: OtpDialogProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { seconds: timeLeft, reset: resetExpiry } = useCountdown(OTP_EXPIRY_SECONDS);
  const { seconds: resendCooldown, reset: resetResend } = useCountdown(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const otpInputRef = useRef<OtpCodeInputHandle>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    otpInputRef.current?.focusFirst();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleVerify = useCallback(
    async (codeOverride?: string) => {
      const code = codeOverride ?? otp;
      if (code.length !== OTP_LENGTH) {
        setError("Please enter all 6 digits.");
        return;
      }

      if (timeLeft <= 0) {
        setError("OTP has expired. Please request a new one.");
        return;
      }

      if (verifyingRef.current) return;
      verifyingRef.current = true;

      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: code }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Verification failed.");
          setOtp("");
          otpInputRef.current?.focusFirst();
          setLoading(false);
          verifyingRef.current = false;
        } else {
          setVerified(true);
          onVerified();
        }
      } catch {
        setError("Something went wrong. Please try again.");
        setOtp("");
        otpInputRef.current?.focusFirst();
        setLoading(false);
        verifyingRef.current = false;
      }
    },
    [otp, email, timeLeft, onVerified],
  );

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await onResend();
      resetExpiry(OTP_EXPIRY_SECONDS);
      resetResend(RESEND_COOLDOWN_SECONDS);
      setOtp("");
      otpInputRef.current?.focusFirst();
    } catch {
      setError("Failed to resend OTP.");
      setOtp("");
      otpInputRef.current?.focusFirst();
    } finally {
      setResending(false);
    }
  };

  const content = verified ? (
    <div className="flex flex-col py-2">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="text-[clamp(1.75rem,4vw,2.15rem)] font-bold leading-[1.1] tracking-[-0.035em] text-white">
        Email verified
      </h2>
      <p className="mt-3 text-[0.95rem] text-[#B4C0D0]">Signing you in…</p>
      <svg
        className="mt-4 h-5 w-5 animate-spin text-blue-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  ) : (
    <>
      {variant === "modal" ? (
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 cursor-pointer text-[#B4C0D0] transition-colors hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}

      <div className="mb-8">
        <h2 className="text-[clamp(1.75rem,4vw,2.15rem)] font-bold leading-[1.1] tracking-[-0.035em] text-white">
          Check your inbox
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[#B4C0D0]">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-[#CBD5E1]">{email}</span>
        </p>
      </div>

      <OtpCodeInput
        ref={otpInputRef}
        value={otp}
        onChange={(value) => {
          setOtp(value);
          setError("");
        }}
        onComplete={handleVerify}
        invalid={Boolean(error)}
      />

      <div className="mt-4">
        {timeLeft > 0 ? (
          <p className="text-xs text-[#B8C0CE]">
            Code expires in{" "}
            <span
              className={`font-mono font-semibold ${
                timeLeft <= 60 ? "text-red-400" : "text-[#CBD5E1]"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </p>
        ) : (
          <p className="text-xs font-medium text-red-400">Code expired</p>
        )}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleVerify()}
        disabled={loading || otp.length !== OTP_LENGTH}
        className="mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#2563EB] text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <svg
            className="h-5 w-5 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          "Verify email"
        )}
      </button>

      <div className="mt-4">
        {resendCooldown > 0 ? (
          <p className="text-xs text-[#B8C0CE]">
            Resend code in{" "}
            <span className="font-mono font-semibold text-[#CBD5E1]">{resendCooldown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="cursor-pointer text-xs font-medium text-[#60A5FA] transition-colors hover:text-white disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>

      {variant === "inline" ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-1.5 text-xs text-[#B4C0D0] transition-colors hover:text-[#CBD5E1]"
        >
          <IconArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Use a different email
        </button>
      ) : null}
    </>
  );

  if (variant === "inline") {
    return <div className="relative">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 backdrop-blur-md">
      <div className="relative mx-4 w-full max-w-[26rem] rounded-2xl border border-white/[0.08] bg-[#0C0F1A]/95 p-7 text-white backdrop-blur-md sm:p-8">
        {content}
      </div>
    </div>
  );
}
