"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        setLoading(true);

        // Simulate auth — replace with real logic later
        setTimeout(() => {
            setLoading(false);
            router.push("/dashboard");
        }, 800);
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
                    <blockquote className="max-w-md text-lg leading-relaxed text-zinc-400">
                        &ldquo;SnapInterview helped me prepare for my Google interview in
                        just two weeks. The AI feedback was eerily accurate.&rdquo;
                    </blockquote>
                    <p className="mt-4 text-sm font-medium text-zinc-500">
                        — Sarah K., Software Engineer
                    </p>
                </div>

                <p className="text-xs text-zinc-600">
                    © {new Date().getFullYear()} SnapInterview
                </p>
            </div>

            {/* ─── Right: Login Form ─── */}
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
                        Welcome back
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Log in to continue practicing
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

                        {/* Password */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-zinc-700"
                                >
                                    Password
                                </label>
                                <a
                                    href="#"
                                    className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-100"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

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
                                "Log in"
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-zinc-200" />
                        <span className="text-xs text-zinc-400">or</span>
                        <span className="h-px flex-1 bg-zinc-200" />
                    </div>

                    {/* Social login placeholder */}
                    <button
                        type="button"
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

                    {/* Sign up link */}
                    <p className="mt-8 text-center text-sm text-zinc-500">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/signup"
                            className="font-semibold text-zinc-900 hover:underline"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
