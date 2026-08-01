"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import OtpDialog from "@/components/OtpDialog";
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

export default function SignupPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    const { error } = await signIn.email({
      email,
      password,
    });

    if (error) {
      setStep("form");
      setError("Account created but sign-in failed. Please log in manually.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <AuthShell
      footer={
        step === "form" ? (
          <>
            Already have an account?{" "}
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
      {step === "form" ? (
        <>
          <AuthHeader
            title="Create your account"
            description="Mic, video, transcript, and scoring in one practice."
            align="center"
          />

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <AuthTextField
              id="name"
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Jane Doe"
              autoComplete="name"
            />

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
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />

            <PasswordInput
              id="confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />

            {error ? <AuthError message={error} /> : null}

            <p className="pt-0.5 text-center text-[11px] leading-relaxed text-[#CBD5E1]">
              By continuing you agree to our Terms and Privacy Policy.
            </p>

            <div className="pt-0.5">
              <SubmitButton loading={loading} text="Create account" />
            </div>
          </form>

          <AuthDivider />
          <GoogleSignInButton text="Continue with Google" />
        </>
      ) : (
        <OtpDialog
          variant="inline"
          email={email}
          onVerified={handleOtpVerified}
          onCancel={() => {
            setStep("form");
            setError("");
          }}
          onResend={sendOtp}
        />
      )}
    </AuthShell>
  );
}
