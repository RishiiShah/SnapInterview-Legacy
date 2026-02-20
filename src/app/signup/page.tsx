"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import OtpDialog from "@/components/OtpDialog";

export default function SignupPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    // Redirect to dashboard if user is already logged in
    useEffect(() => {
        if (status === "authenticated" && session) {
            router.push("/dashboard");
        }
    }, [session, status, router]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showOtpDialog, setShowOtpDialog] = useState(false);

    const sendOtp = async () => {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        return data;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await sendOtp();
            setShowOtpDialog(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerified = async () => {
        // OTP verified, user created — now auto sign-in
        const signInRes = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (signInRes?.error) {
            setShowOtpDialog(false);
            setError("Account created but sign-in failed. Please log in manually.");
        } else {
            router.push("/dashboard");
        }
    };

    const handleOtpCancel = () => {
        setShowOtpDialog(false);
    };

    const handleOtpResend = async () => {
        await sendOtp();
    };

    const handleGoogleSignIn = () => {
        signIn("google", { callbackUrl: "/dashboard" });
    };

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
                        Start preparing for your dream job today
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                        Join over 50,000 candidates who improved their interview
                        performance with AI-powered mock sessions and instant feedback.
                    </p>

                    <div className="mt-8 flex items-center gap-6">
                        {[
                            { value: "50k+", label: "Users" },
                            { value: "93%", label: "Success" },
                            { value: "4.9/5", label: "Rating" },
                        ].map((s) => (
                            <div key={s.label}>
                                <p className="text-lg font-bold text-white">{s.value}</p>
                                <p className="text-xs text-zinc-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-xs text-zinc-600">
                    © {new Date().getFullYear()} SnapInterview
                </p>
            </div>

            {/* ─── Right: Signup Form ─── */}
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
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        Create your account
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Get started with free mock interviews
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                        {/* Name */}
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-zinc-700"
                            >
                                Full name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Jane Doe"
                                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-zinc-700"
                            >
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

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-zinc-700"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="mb-1.5 block text-sm font-medium text-zinc-700"
                            >
                                Confirm password
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
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        {/* Terms */}
                        <p className="text-xs leading-relaxed text-zinc-400">
                            By creating an account you agree to our{" "}
                            <a href="#" className="underline hover:text-zinc-600">Terms of Service</a>{" "}
                            and{" "}
                            <a href="#" className="underline hover:text-zinc-600">Privacy Policy</a>.
                        </p>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl disabled:opacity-50"
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
                                "Create account"
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-zinc-200" />
                        <span className="text-xs text-zinc-400">or</span>
                        <span className="h-px flex-1 bg-zinc-200" />
                    </div>

                    {/* Google signup */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-100 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-200 hover:bg-zinc-50"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Login link */}
                    <p className="mt-8 text-center text-sm text-zinc-500">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-zinc-900 hover:underline"
                        >
                            Log in
                        </Link>
                    </p>
                </div>
            </div>

            {/* ─── OTP Verification Dialog ─── */}
            {showOtpDialog && (
                <OtpDialog
                    email={email}
                    onVerified={handleOtpVerified}
                    onCancel={handleOtpCancel}
                    onResend={handleOtpResend}
                />
            )}
        </div>
    );
}
