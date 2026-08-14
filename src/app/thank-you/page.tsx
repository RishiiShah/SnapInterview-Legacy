"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/ui/AppLogo";
import { useSession } from "@/lib/auth-client";
import {
  IconCheckCircle,
  IconArrowRight,
  IconQuestionBank,
  IconHelp,
} from "@/components/ui/icons";
import LandingFooter from "@/components/landing/LandingFooter";

function ThankYouContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId") || searchParams.get("ref");
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
      {/* Success Badge */}
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
        <IconCheckCircle className="h-6 w-6" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Submission Received
        </h1>
        <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed max-w-md mx-auto">
          Thank you for reaching out to SnapInterview. Our team has received your message and will follow up via email within 24 hours.
        </p>
      </div>

      {/* Ticket Reference Badge if provided */}
      {ticketId ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          Ticket Reference: <strong className="font-mono text-white">{ticketId}</strong>
        </div>
      ) : null}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          prefetch={false}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-500"
        >
          <span>{isLoggedIn ? "Go to Dashboard" : "Return to Home"}</span>
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>

        <Link
          href="/faq"
          prefetch={false}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-xs sm:text-sm font-medium text-white transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
        >
          <IconQuestionBank className="h-4 w-4 text-[#94A3B8]" />
          <span>Browse FAQ</span>
        </Link>
      </div>

      {/* Helpful Link */}
      <div className="border-t border-white/[0.06] pt-4">
        <Link
          href="/support"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] transition-colors hover:text-blue-400"
        >
          <IconHelp className="h-3.5 w-3.5" />
          <span>Submit another request on Help & Support</span>
        </Link>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F5F7FF] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090A0F]/80 px-4 backdrop-blur-md sm:px-8 lg:px-12">
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          prefetch={false}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <AppLogo size={28} className="rounded-md" priority />
          <span className="text-sm font-semibold tracking-tight text-white">
            Snap<span className="text-blue-400">Interview</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/faq"
            prefetch={false}
            className="text-xs font-medium text-[#CBD5E1] transition-colors hover:text-white"
          >
            FAQ
          </Link>
          <Link
            href="/support"
            prefetch={false}
            className="text-xs font-medium text-[#CBD5E1] transition-colors hover:text-white"
          >
            Help & Support
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              prefetch={false}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              prefetch={false}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500"
            >
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
        <Suspense fallback={<div className="h-64 w-full max-w-lg animate-pulse rounded-xl bg-white/[0.02] border border-white/[0.08]" />}>
          <ThankYouContent />
        </Suspense>
      </main>

      <LandingFooter />
    </div>
  );
}