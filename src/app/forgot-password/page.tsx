"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AUTH_EASE,
  AuthDivider,
  AuthError,
  AuthFormStagger,
  AuthFormStaggerItem,
  AuthHeader,
  AuthShell,
  AuthTextField,
} from "@/components/auth/AuthShell";
import {
  OtpCodeInput,
  type OtpCodeInputHandle,
} from "@/components/auth/OtpCodeInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { IconArrowLeft, IconCheckCircle } from "@/components/ui/icons";
import { useCountdown } from "@/hooks/useCountdown";

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState<"email" | "otp" | "done">("email");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const { seconds: resendCooldown, reset: resetResend } = useCountdown(0);
  const [resending, setResending] = useState(false);
  const otpInputRef = useRef<OtpCodeInputHandle>(null);

  useEffect(() => {
    if (step === "otp") otpInputRef.current?.focusFirst();
  }, [step]);

  async function sendResetEmail() {
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    if (!email.trim()) { setEmailError("Please enter your email."); return; }

    setEmailLoading(true);
    try {
      await sendResetEmail();
      setStep("otp");
      resetResend(30);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setEmailLoading(false);
    }
  }

  const handleResetPassword = useCallback(async () => {
    setOtpError("");
    const code = otp;
    if (code.length !== OTP_LENGTH) { setOtpError("Please enter all 6 digits."); return; }
    if (!newPassword) { setOtpError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setOtpError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setOtpError("Passwords do not match."); return; }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to reset password.");
        if (data.error?.includes("expired") || data.error?.includes("No reset")) {
          setOtp("");
          otpInputRef.current?.focusFirst();
        }
      } else {
        setStep("done");
      }
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }, [otp, email, newPassword, confirmPassword]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setOtpError("");
    try {
      await sendResetEmail();
      resetResend(30);
      setOtp("");
      otpInputRef.current?.focusFirst();
    } catch {
      setOtpError("Failed to resend code.");
      setOtp("");
      otpInputRef.current?.focusFirst();
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      footer={
        step === "email" ? (
          <>
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-[#CBD5E1] transition-colors hover:text-white"
            >
              Log in <span className="text-[#60A5FA]">→</span>
            </Link>
          </>
        ) : null
      }
    >
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="forgot-email-step"
            initial={reducedMotion ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: 16 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.61, ease: AUTH_EASE }
            }
          >
            <AuthFormStagger>
              <AuthFormStaggerItem>
                <AuthHeader
                  title="Forgot password?"
                  description="Enter your email and we’ll send a verification code to reset it."
                  align="center"
                />
              </AuthFormStaggerItem>

              <form onSubmit={handleEmailSubmit} noValidate autoComplete="off" className="space-y-4">
                <AuthFormStaggerItem>
                  <AuthTextField
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="off"
                  />
                </AuthFormStaggerItem>

                {emailError ? (
                  <AuthFormStaggerItem>
                    <AuthError message={emailError} />
                  </AuthFormStaggerItem>
                ) : null}

                <AuthFormStaggerItem className="pt-1">
                  <SubmitButton
                    loading={emailLoading}
                    text="Send reset code"
                    sentText="Sent"
                  />
                </AuthFormStaggerItem>
              </form>
            </AuthFormStagger>
          </motion.div>
        ) : null}

        {step === "otp" ? (
          <motion.div
            key="forgot-otp-step"
            initial={reducedMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -16 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.61, ease: AUTH_EASE }
            }
          >
            <AuthFormStagger>
              <AuthFormStaggerItem>
                <AuthHeader
                  title="Reset password"
                  description={`Enter the 6-digit code sent to ${email}`}
                />
              </AuthFormStaggerItem>

              <AuthFormStaggerItem>
                <OtpCodeInput
                  ref={otpInputRef}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setOtpError("");
                  }}
                  invalid={Boolean(otpError)}
                />

                <div className="mt-3">
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
              </AuthFormStaggerItem>

              <AuthFormStaggerItem>
                <AuthDivider label="new password" />
              </AuthFormStaggerItem>

              <AuthFormStaggerItem>
                <div className="space-y-3.5">
                  <PasswordInput
                    id="new-password"
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    id="confirm-password"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                  />
                </div>
              </AuthFormStaggerItem>

              {otpError ? (
                <AuthFormStaggerItem className="mt-4">
                  <AuthError message={otpError} />
                </AuthFormStaggerItem>
              ) : null}

              <AuthFormStaggerItem className="mt-5">
                <SubmitButton
                  loading={otpLoading}
                  text="Reset password"
                  onClick={handleResetPassword}
                  disabled={otp.length !== OTP_LENGTH || !newPassword || !confirmPassword}
                />
              </AuthFormStaggerItem>

              <AuthFormStaggerItem>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); setOtpError(""); }}
                  className="mt-5 flex w-full cursor-pointer items-center justify-center gap-1.5 text-xs text-[#CBD5E1] transition-colors hover:text-[#CBD5E1]"
                >
                  <IconArrowLeft className="h-3.5 w-3.5" />
                  Use a different email
                </button>
              </AuthFormStaggerItem>
            </AuthFormStagger>
          </motion.div>
        ) : null}

        {step === "done" ? (
          <motion.div
            key="forgot-done-step"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.61, ease: AUTH_EASE }
            }
          >
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
              <IconCheckCircle className="h-6 w-6" strokeWidth={2} />
            </div>
            <AuthHeader
              title="Password updated"
              description="You can now log in with your new credentials."
            />
            <SubmitButton
              loading={false}
              text="Go to login"
              onClick={() => router.push("/login")}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthShell>
  );
}
