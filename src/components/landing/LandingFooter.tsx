import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#05060A] py-12 text-[#94A3B8]">
      <div className="landing-container flex flex-col items-center justify-between gap-6 sm:flex-row">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <AppLogo size={28} className="rounded-md" />
            <span className="text-base font-semibold tracking-tight text-white">
              Snap<span className="text-[#60A5FA]">Interview</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.65rem] font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Systems Operational
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" aria-label="Footer Navigation">
          <a href="#features" className="transition-colors hover:text-white">
            Capabilities
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-white">
            The Journey
          </a>
          <a href="#get-started" className="transition-colors hover:text-white">
            Start Now
          </a>
          <Link href="/login" className="transition-colors hover:text-white">
            Sign In
          </Link>
          <Link href="/signup" className="transition-colors hover:text-white">
            Register
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-[#64748B]">
          © {new Date().getFullYear()} SnapInterview. All rights reserved.
        </p>

      </div>
    </footer>
  );
}
