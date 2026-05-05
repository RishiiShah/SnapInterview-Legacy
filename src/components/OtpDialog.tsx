"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface OtpDialogProps {
    email: string;
    onVerified: () => void;
    onCancel: () => void;
    onResend: () => Promise<void>;
}

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpDialog({ email, onVerified, onCancel, onResend }: OtpDialogProps) {
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const verifyingRef = useRef(false);

    // Focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // OTP expiry countdown
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleChange = (index: number, value: string) => {
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError("");

        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (newOtp.every((d) => d !== "")) {
            void handleVerify(newOtp);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (!pasted) return;

        const newOtp = [...otp];
        for (let i = 0; i < pasted.length; i++) {
            newOtp[i] = pasted[i];
        }
        setOtp(newOtp);
        setError("");

        const nextEmpty = newOtp.findIndex((v) => !v);
        inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();

        if (newOtp.every((d) => d !== "")) {
            void handleVerify(newOtp);
        }
    };

    const handleVerify = useCallback(async (otpOverride?: string[]) => {
        const code = (otpOverride ?? otp).join("");
        if (code.length !== OTP_LENGTH) {
            setError("Please enter all 6 digits.");
            return;
        }

        if (timeLeft <= 0) {
            setError("OTP has expired. Please request a new one.");
            return;
        }

        // Prevent duplicate submissions (React StrictMode fires effects twice)
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
                setOtp(Array(OTP_LENGTH).fill(""));
                inputRefs.current[0]?.focus();
                setLoading(false);
                verifyingRef.current = false;
            } else {
                // Keep verifyingRef locked and show success state
                // so no duplicate calls happen during sign-in
                setVerified(true);
                onVerified();
            }
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
            verifyingRef.current = false;
        }
    }, [otp, email, timeLeft, onVerified]);

    const handleResend = async () => {
        if (resendCooldown > 0 || resending) return;
        setResending(true);
        setError("");
        try {
            await onResend();
            setTimeLeft(OTP_EXPIRY_SECONDS);
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setOtp(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
        } catch {
            setError("Failed to resend OTP.");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white p-8 shadow-2xl animate-in">
                {verified ? (
                    /* ─── Success State ─── */
                    <div className="flex flex-col items-center py-4">
                        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100">
                            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h2 className="text-center text-xl font-bold text-zinc-900">Email verified!</h2>
                        <p className="mt-2 text-center text-sm text-zinc-500">Signing you in…</p>
                        <svg
                            className="mt-4 h-5 w-5 animate-spin text-zinc-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : (
                    /* ─── OTP Input State ─── */
                    <>
                        {/* Close button */}
                        <button
                            onClick={onCancel}
                            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Icon */}
                        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100">
                            <svg className="h-7 w-7 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h2 className="text-center text-xl font-bold text-zinc-900">Check your email</h2>
                        <p className="mt-2 text-center text-sm text-zinc-500">
                            We sent a 6-digit code to{" "}
                            <span className="font-medium text-zinc-700">{email}</span>
                        </p>

                        {/* OTP Inputs */}
                        <div className="mt-7 flex justify-center gap-2.5" onPaste={handlePaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => { inputRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className={`h-13 w-11 rounded-xl border-2 bg-zinc-50 text-center text-xl font-bold text-zinc-900 outline-none transition-all
                                        ${error ? "border-red-300 bg-red-50/50" : "border-zinc-200"}
                                        focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100`}
                                    aria-label={`Digit ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* Timer */}
                        <div className="mt-4 text-center">
                            {timeLeft > 0 ? (
                                <p className="text-sm text-zinc-400">
                                    Code expires in{" "}
                                    <span className={`font-mono font-semibold ${timeLeft <= 60 ? "text-red-500" : "text-zinc-600"}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-red-500">Code expired</p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
                        )}

                        {/* Verify button */}
                        <button
                            onClick={() => void handleVerify()}
                            disabled={loading || otp.some((d) => !d)}
                            className="mt-6 flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl disabled:opacity-50"
                        >
                            {loading ? (
                                <svg
                                    className="h-5 w-5 animate-spin text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                "Verify email"
                            )}
                        </button>

                        {/* Resend */}
                        <div className="mt-4 text-center">
                            {resendCooldown > 0 ? (
                                <p className="text-sm text-zinc-400">
                                    Resend code in{" "}
                                    <span className="font-mono font-semibold text-zinc-600">{resendCooldown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="text-sm font-semibold text-zinc-900 hover:underline disabled:opacity-50"
                                >
                                    {resending ? "Sending…" : "Resend code"}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
