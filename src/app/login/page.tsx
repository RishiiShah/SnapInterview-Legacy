"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import {
  AuthDivider,
  AuthError,
  AuthFormStagger,
  AuthFormStaggerItem,
  AuthHeader,
  AuthShell,
  AuthTextField,
} from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SubmitButton } from "@/components/auth/SubmitButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.push(callbackUrl);
    }
  }, [session, isPending, router, callbackUrl]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setLoading(true);

    const { error } = await signIn.email({ email: email.trim(), password });

    if (error) {
      setLoading(false);
      setError("Invalid email or password.");
    } else {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        router.push(callbackUrl);
      }, 500);
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
      <AuthFormStagger>
        <AuthFormStaggerItem>
          <AuthHeader
            title="Log in"
            description="Pick up where you left off with practice sessions, recordings, and scores."
            align="center"
          />
        </AuthFormStaggerItem>

        <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
          <AuthFormStaggerItem>
            <AuthTextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (emailError) setEmailError("");
              }}
              placeholder="you@example.com"
              autoComplete="off"
              error={emailError}
            />
          </AuthFormStaggerItem>

          <AuthFormStaggerItem>
            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              showForgotPasswordLink
              autoComplete="off"
            />
          </AuthFormStaggerItem>

          {error ? (
            <AuthFormStaggerItem>
              <AuthError message={error} />
            </AuthFormStaggerItem>
          ) : null}

          <AuthFormStaggerItem className="pt-1">
            <SubmitButton loading={loading} success={success} text="Log in" sentText="Logging in..." />
          </AuthFormStaggerItem>
        </form>

        <AuthFormStaggerItem>
          <AuthDivider />
        </AuthFormStaggerItem>

        <AuthFormStaggerItem>
          <GoogleSignInButton callbackUrl={callbackUrl} />
        </AuthFormStaggerItem>
      </AuthFormStagger>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0E14]" />}>
      <LoginForm />
    </Suspense>
  );
}
