import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 px-[var(--landing-gutter)] py-[clamp(2rem,4vw,3rem)] text-[#657086]">
      <div className="landing-container flex flex-col items-center justify-between gap-4 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo size={28} className="rounded-md" />
          <span className="text-sm font-semibold text-[#F5F7FF]">
            Snap<span className="text-[#A5B4FC]">Interview</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
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
        </div>
        <p className="text-sm">© {new Date().getFullYear()} SnapInterview</p>
      </div>
    </footer>
  );
}
