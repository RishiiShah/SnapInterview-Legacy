"use client";

import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

const LINKS = [
  { label: "Studio", href: "#studio" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Get Started", href: "#get-started" },
  { label: "Sign In", href: "/login" },
  { label: "Register", href: "/signup" },
];

function scrollHome(event: React.MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;

  event.preventDefault();
  if (window.location.hash) {
    history.replaceState(null, "", "/");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.07] bg-[#090A0F] py-8 text-[#64748B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">

          <Link
            href="/"
            onClick={scrollHome}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <AppLogo size={28} className="rounded-md" />
            <span className="text-sm font-semibold tracking-tight text-white">
              Snap<span className="text-blue-400">Interview</span>
            </span>
          </Link>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
            aria-label="Footer Navigation"
          >
            {LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className="transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-[#334155]">
            &copy; {new Date().getFullYear()} SnapInterview
          </p>

        </div>
      </div>
    </footer>
  );
}
