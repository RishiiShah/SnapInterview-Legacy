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
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { IconArrowLeft, IconCheckCircle } from "@/components/ui/icons";

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState<"email" | "otp" | "done">("email");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === "otp") inputRefs.current[0]?.focus();
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
      setResendCooldown(30);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setEmailLoading(false);
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError("");
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    setOtpError("");
    const nextEmpty = next.findIndex((v) => !v);
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
  };

  const handleResetPassword = useCallback(async () => {
    setOtpError("");
    const code = otp.join("");
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
          setOtp(Array(OTP_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
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
      setResendCooldown(30);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      setOtpError("Failed to resend code.");
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
                <div className="flex justify-start gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`h-12 w-10 rounded-xl border bg-[#0C0F1A]/80 text-center text-lg font-semibold text-white outline-none transition-colors sm:w-11 ${
                        otpError
                          ? "border-red-500/50"
                          : digit
                            ? "border-blue-500/50"
                            : "border-white/[0.1]"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15`}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

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
                  disabled={otp.some((d) => !d) || !newPassword || !confirmPassword}
                />
              </AuthFormStaggerItem>

              <AuthFormStaggerItem>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); }}
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
