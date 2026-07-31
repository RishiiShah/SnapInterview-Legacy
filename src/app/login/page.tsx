"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import {
  AuthDivider,
  AuthError,
  AuthHeader,
  AuthShell,
  AuthTextField,
} from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SubmitButton } from "@/components/auth/SubmitButton";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    const { error } = await signIn.email({ email, password });

    setLoading(false);

    if (error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <AuthShell
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#CBD5E1] transition-colors hover:text-white"
          >
            Sign up <span className="text-[#60A5FA]">→</span>
          </Link>
        </>
      }
    >
      <AuthHeader
        title="Log in"
        description="Pick up where you left off with practice sessions, recordings, and scores."
        align="center"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthTextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          showForgotPasswordLink
          autoComplete="current-password"
        />

        {error ? <AuthError message={error} /> : null}

        <div className="pt-1">
          <SubmitButton loading={loading} text="Log in" />
        </div>
      </form>

      <AuthDivider />
      <GoogleSignInButton />
    </AuthShell>
  );
}
