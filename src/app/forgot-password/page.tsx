"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    // Eye icon SVGs
    const EyeOpen = (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
    const EyeClosed = (
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
    );

    return (
        <div className="flex min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
            {/* ─── Left: Branding Panel ─── */}
            <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 lg:flex">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[11px] font-bold leading-none tracking-tighter text-zinc-900">
                        SI
                    </div>
                    <span className="text-lg font-semibold tracking-tight text-white">
                        SnapInterview
                    </span>
                </Link>

                <div>
                    <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
                        Reset your password
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                        We&apos;ll send a verification code to your email so you can
                        securely set a new password and get back to practicing.
                    </p>
                </div>

                <p className="text-xs text-zinc-600">
                    © {new Date().getFullYear()} SnapInterview
                </p>
            </div>

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
                                <svg className="h-7 w-7 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
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

                                <button
                                    type="submit"
                                    disabled={emailLoading}
                                    className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl disabled:opacity-50"
                                >
                                    {emailLoading ? (
                                        <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        "Send reset code"
                                    )}
                                </button>
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
                                <svg className="h-7 w-7 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
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
                                <div>
                                    <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-zinc-700">
                                        New password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="new-password"
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                            aria-label={showNewPassword ? "Hide password" : "Show password"}>
                                            {showNewPassword ? EyeClosed : EyeOpen}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-zinc-700">
                                        Confirm new password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="confirm-password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                                            {showConfirmPassword ? EyeClosed : EyeOpen}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {otpError && (
                                <p className="mt-3 text-sm text-red-600">{otpError}</p>
                            )}

                            <button
                                onClick={handleResetPassword}
                                disabled={otpLoading || otp.some((d) => !d) || !newPassword || !confirmPassword}
                                className="mt-6 flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl disabled:opacity-50"
                            >
                                {otpLoading ? (
                                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    "Reset password"
                                )}
                            </button>

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
                                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
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
