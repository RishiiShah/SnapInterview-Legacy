"use client";

import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { useSession } from "@/lib/auth-client";
import {
  IconArrowRight,
  IconHelp,
  IconQuestionBank,
  IconMessage,
  IconCode,
} from "@/components/ui/icons";
import LandingFooter from "@/components/landing/LandingFooter";

const POPULAR_HUBS = [
  {
    title: "AI Mock Interviews",
    desc: "Practice role-specific voice interviews with automated scoring.",
    icon: IconMessage,
    href: "/practice",
  },
  {
    title: "Coding Workspace",
    desc: "Execute code in JavaScript, Python, C++, Java, and Go.",
    icon: IconCode,
    href: "/coding",
  },
  {
    title: "Question Bank",
    desc: "Explore real technical interview problems from top companies.",
    icon: IconQuestionBank,
    href: "/questions",
  },
  {
    title: "Help & Support",
    desc: "Submit a support ticket or get direct engineering help.",
    icon: IconHelp,
    href: "/support",
  },
];

export default function NotFoundPage() {
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

      {/* Main Content Area - Unified Symmetrical Card Layout */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0C0F1A] p-8 sm:p-12 space-y-8 shadow-2xl">
          {/* Centered Hero Header */}
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-bold text-blue-400">
              ERROR 404
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Page Not Found
            </h1>

            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
              The page you are looking for might have been moved, renamed, or does not exist. Use the links below to return home or explore our platform hubs.
            </p>

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
          </div>

          {/* Section Divider & 4-Column Symmetrical Hub Grid */}
          <div className="border-t border-white/[0.08] pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                Explore Popular Platform Hubs
              </h2>
              <Link
                href="/support"
                prefetch={false}
                className="text-xs font-medium text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Contact Support</span>
                <IconArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {POPULAR_HUBS.map((hub) => {
                const Icon = hub.icon;
                return (
                  <Link
                    key={hub.title}
                    href={hub.href}
                    prefetch={false}
                    className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.03]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <IconArrowRight className="h-3.5 w-3.5 text-[#7D889B] group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {hub.title}
                        </h3>
                        <p className="mt-1 text-xs text-[#CBD5E1] leading-relaxed">
                          {hub.desc}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}