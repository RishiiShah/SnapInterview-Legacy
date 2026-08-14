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
  IconMessage,
  IconCode,
} from "@/components/ui/icons";
import LandingFooter from "@/components/landing/LandingFooter";

const RECOMMENDED_NEXT_STEPS = [
  {
    title: "AI Mock Interviews",
    desc: "Practice role-specific voice interviews with automated scoring and feedback.",
    icon: IconMessage,
    href: "/practice",
  },
  {
    title: "Coding Workspace",
    desc: "Execute code in JavaScript, Python, C++, Java, and Go with automated test cases.",
    icon: IconCode,
    href: "/coding",
  },
  {
    title: "Question Bank",
    desc: "Explore real technical interview problems from top tech companies.",
    icon: IconQuestionBank,
    href: "/questions",
  },
];

function ThankYouContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId") || searchParams.get("ref");
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
      {/* Left Column: Main Confirmation Card (7 cols) */}
      <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10 space-y-6 shadow-2xl">
        {/* Success Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-400">
          <IconCheckCircle className="h-4 w-4" />
          <span>Submission Confirmation</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Submission Received
          </h1>
          <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
            Thank you for reaching out to SnapInterview. Our engineering team has received your submission and will respond via email within 7 days.
          </p>
        </div>

        {/* Ticket Reference Badge if provided */}
        {ticketId ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center justify-between">
            <span>Ticket Reference Number:</span>
            <strong className="font-mono text-white text-sm">{ticketId}</strong>
          </div>
        ) : null}

        {/* SLA Notice */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-[#CBD5E1] space-y-1">
          <p className="font-semibold text-white">Service Level Agreement (SLA)</p>
          <p className="text-[#94A3B8] leading-relaxed">
            All tickets are assigned to staff engineers and answered in order of receipt within 7 days.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
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

      {/* Right Column: Recommended Next Steps (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="border-b border-white/[0.08] pb-3">
          <h2 className="text-sm font-semibold text-white">Recommended Next Steps</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">Explore practice tools while you wait</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {RECOMMENDED_NEXT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                prefetch={false}
                className="group flex items-start gap-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.03]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {step.title}
                    </h3>
                    <IconArrowRight className="h-3.5 w-3.5 text-[#7D889B] group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="mt-0.5 text-xs text-[#CBD5E1] leading-relaxed line-clamp-2">
                    {step.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
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

      {/* Main Content Area - 2 Column Layout utilizing full max-w-7xl desktop width */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8 flex items-center">
        <Suspense fallback={<div className="h-64 w-full max-w-5xl animate-pulse rounded-xl bg-white/[0.02] border border-white/[0.08]" />}>
          <ThankYouContent />
        </Suspense>
      </main>

      <LandingFooter />
    </div>
  );
}