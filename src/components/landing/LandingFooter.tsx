import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

export default function LandingFooter() {
  return (
    <footer className="landing-footer-shell text-[#657086]">
      <div className="landing-container flex flex-col items-center justify-between gap-3 sm:flex-row">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <AppLogo size={24} className="rounded-md" />
          <span className="text-sm font-semibold text-[#F5F7FF]">
            Snap<span className="text-[#A5B4FC]">Interview</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm" aria-label="Footer">
          <a href="#features" className="transition-colors hover:text-[#F5F7FF]">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-[#F5F7FF]">
            How it works
          </a>
          <a href="#get-started" className="transition-colors hover:text-[#F5F7FF]">
            Get started
          </a>
          <Link href="/login" className="transition-colors hover:text-[#F5F7FF]">
            Sign In
          </Link>
        </nav>
        <p className="text-xs sm:text-sm">© {new Date().getFullYear()} SnapInterview</p>
      </div>
    </footer>
  );
}
