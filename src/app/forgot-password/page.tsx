"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthSidePanel } from "@/components/auth/AuthSidePanel";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { IconCheckCircle, IconEnvelope, IconLockClosed } from "@/components/ui/icons";

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
    const router = useRouter();

    // Steps: "email" → "otp" → "done"
    const [step, setStep] = useState<"email" | "otp" | "done">("email");

    // Email step
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);

    // OTP + new password step
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend cooldown timer
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

    // Focus first OTP input when entering otp step
    useEffect(() => {
        if (step === "otp") {
            inputRefs.current[0]?.focus();
        }
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

    // OTP input handlers
    const handleOtpChange = (index: number, value: string) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
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
        const newOtp = [...otp];
        for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
        setOtp(newOtp);
        setOtpError("");
        const nextEmpty = newOtp.findIndex((v) => !v);
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
                    // Clear OTP on expiry
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
        <div className="flex min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
            <AuthSidePanel
                title="Reset your password"
                subtitle="We'll send a verification code to your email so you can securely set a new password and get back to practicing."
            />

            {/* ─── Right: Form ─── */}
            <div className="flex w-full flex-col items-center justify-center bg-white px-6 lg:w-1/2">
                {/* Mobile logo */}
                <div className="mb-10 lg:hidden">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold leading-none tracking-tighter text-white">
                            SI
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-zinc-900">
                            SnapInterview
                        </span>
                    </Link>
                </div>

                <div className="w-full max-w-sm">
                    {/* ═══ Step 1: Enter Email ═══ */}
                    {step === "email" && (
                        <>
                            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100">
                                <IconLockClosed className="h-7 w-7 text-zinc-700" />
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                Forgot your password?
                            </h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                Enter your email and we&apos;ll send you a code to reset it.
                            </p>

                            <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
                                <div>
                                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                                    />
                                </div>

                                {emailError && (
                                    <p className="text-sm text-red-600">{emailError}</p>
                                )}

                                <SubmitButton loading={emailLoading} text="Send reset code" />
                            </form>

                            <p className="mt-8 text-center text-sm text-zinc-500">
                                Remember your password?{" "}
                                <Link href="/login" className="font-semibold text-zinc-900 hover:underline">
                                    Log in
                                </Link>
                            </p>
                        </>
                    )}

                    {/* ═══ Step 2: Enter OTP + New Password ═══ */}
                    {step === "otp" && (
                        <>
                            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100">
                                <IconEnvelope className="h-7 w-7 text-zinc-700" />
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                Reset your password
                            </h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                Enter the 6-digit code sent to{" "}
                                <span className="font-medium text-zinc-700">{email}</span>
                            </p>

                            {/* OTP Inputs */}
                            <div className="mt-7 flex justify-center gap-2.5" onPaste={handleOtpPaste}>
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
                                        className={`h-13 w-11 rounded-xl border-2 bg-zinc-50 text-center text-xl font-bold text-zinc-900 outline-none transition-all
                                            ${otpError ? "border-red-300 bg-red-50/50" : "border-zinc-200"}
                                            focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100`}
                                        aria-label={`Digit ${i + 1}`}
                                    />
                                ))}
                            </div>

                            {/* Resend */}
                            <div className="mt-3 text-center">
                                {resendCooldown > 0 ? (
                                    <p className="text-sm text-zinc-400">
                                        Resend code in <span className="font-mono font-semibold text-zinc-600">{resendCooldown}s</span>
                                    </p>
                                ) : (
                                    <button onClick={handleResend} disabled={resending}
                                        className="text-sm font-semibold text-zinc-900 hover:underline disabled:opacity-50">
                                        {resending ? "Sending…" : "Resend code"}
                                    </button>
                                )}
                            </div>

                            {/* New Password */}
                            <div className="mt-6 space-y-4">
                                <PasswordInput
                                    id="new-password"
                                    label="New password"
                                    value={newPassword}
                                    onChange={setNewPassword}
                                    placeholder="Min. 8 characters"
                                />
                                <PasswordInput
                                    id="confirm-password"
                                    label="Confirm new password"
                                    value={confirmPassword}
                                    onChange={setConfirmPassword}
                                />
                            </div>

                            {otpError && (
                                <p className="mt-3 text-sm text-red-600">{otpError}</p>
                            )}

                            <div className="mt-6">
                                <SubmitButton
                                    loading={otpLoading}
                                    text="Reset password"
                                    onClick={handleResetPassword}
                                    disabled={otp.some((d) => !d) || !newPassword || !confirmPassword}
                                />
                            </div>

                            <button
                                onClick={() => { setStep("email"); setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); }}
                                className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                            >
                                ← Use a different email
                            </button>
                        </>
                    )}

                    {/* ═══ Step 3: Success ═══ */}
                    {step === "done" && (
                        <div className="text-center">
                            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100">
                                <IconCheckCircle className="h-7 w-7 text-emerald-600" strokeWidth={2} />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                Password reset!
                            </h1>
                            <p className="mt-2 text-sm text-zinc-500">
                                Your password has been updated successfully. You can now log in with your new password.
                            </p>
                            <button
                                onClick={() => router.push("/login")}
                                className="mt-8 flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl"
                            >
                                Go to login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
