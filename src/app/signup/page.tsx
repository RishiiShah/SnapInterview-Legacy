"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import OtpDialog from "@/components/OtpDialog";
import { AuthSidePanel } from "@/components/auth/AuthSidePanel";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SubmitButton } from "@/components/auth/SubmitButton";

export default function SignupPage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    // Redirect to dashboard if user is already logged in
    useEffect(() => {
        if (!isPending && session) {
            router.push("/dashboard");
        }
    }, [session, isPending, router]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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
        const { error } = await signIn.email({
            email,
            password,
        });

        if (error) {
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

    return (
        <div className="flex min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
            <AuthSidePanel
                title="Refine your interview technique"
                subtitle="Access a comprehensive library of behavioral and technical questions. Get immediate feedback on your responses and track your progress over time."
            />

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
                        Get started with mock interviews
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

                        <PasswordInput
                            id="password"
                            label="Password"
                            value={password}
                            onChange={setPassword}
                            placeholder="Min. 8 characters"
                        />

                        <PasswordInput
                            id="confirm-password"
                            label="Confirm password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                        />

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
                        <SubmitButton loading={loading} text="Create account" />
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-zinc-200" />
                        <span className="text-xs text-zinc-400">or</span>
                        <span className="h-px flex-1 bg-zinc-200" />
                    </div>

                    {/* Google signup */}
                    <GoogleSignInButton />

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
