"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import OtpDialog from "@/components/OtpDialog";
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
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SubmitButton } from "@/components/auth/SubmitButton";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const { data: session, isPending } = useSession();
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!isPending && session) {
      router.push(callbackUrl);
    }
  }, [session, isPending, router, callbackUrl]);

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuccess = () => {
    router.push(callbackUrl);
  };

  return (
    <AuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#CBD5E1] transition-colors hover:text-white"
          >
            Log in <span className="text-[#60A5FA]">→</span>
          </Link>
        </>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === "form" ? (
          <motion.div
            key="signup-form"
            initial={reducedMotion ? undefined : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: 8 }}
            transition={{ duration: 0.25, ease: AUTH_EASE }}
          >
            <AuthFormStagger>
              <AuthFormStaggerItem>
                <AuthHeader
                  title="Create an account"
                  description="Start your AI mock interview practice in less than a minute."
                  align="center"
                />
              </AuthFormStaggerItem>

              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
                <AuthFormStaggerItem>
                  <AuthTextField
                    id="name"
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder="Jane Doe"
                    autoComplete="off"
                  />
                </AuthFormStaggerItem>

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

                <AuthFormStaggerItem>
                  <PasswordInput
                    id="password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="off"
                  />
                </AuthFormStaggerItem>

                <AuthFormStaggerItem>
                  <PasswordInput
                    id="confirmPassword"
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="off"
                  />
                </AuthFormStaggerItem>

                {error ? (
                  <AuthFormStaggerItem>
                    <AuthError message={error} />
                  </AuthFormStaggerItem>
                ) : null}

                <AuthFormStaggerItem className="pt-1">
                  <SubmitButton loading={loading} text="Create account" sentText="Creating account..." />
                </AuthFormStaggerItem>
              </form>

              <AuthFormStaggerItem>
                <AuthDivider />
              </AuthFormStaggerItem>

              <AuthFormStaggerItem>
                <GoogleSignInButton callbackUrl={callbackUrl} />
              </AuthFormStaggerItem>
            </AuthFormStagger>
          </motion.div>
        ) : (
          <motion.div
            key="signup-otp"
            initial={reducedMotion ? undefined : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -8 }}
            transition={{ duration: 0.25, ease: AUTH_EASE }}
          >
            <OtpDialog
              email={email}
              onVerified={handleVerifySuccess}
              onCancel={() => {
                setStep("form");
                setError("");
              }}
              onResend={sendOtp}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0E14]" />}>
      <SignupForm />
    </Suspense>
  );
}
