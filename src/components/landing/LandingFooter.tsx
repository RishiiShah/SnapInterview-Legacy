"use client";

import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { useSession } from "@/lib/auth-client";

const LINKS = [
  { label: "Studio", href: "#studio" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "/faq" },
  { label: "Help & Support", href: "/support" },
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
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  return (
    <footer className="relative z-10 border-t border-white/[0.07] bg-[#090A0F] py-8 text-[#CBD5E1]">
      <div className="mx-auto max-w-[140rem] px-6 sm:px-10 lg:px-16 2xl:px-24">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">

          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            prefetch={false}
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
              <Link key={href} href={href} prefetch={false} className="transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-[#B0B8C8]">
            &copy; {new Date().getFullYear()} SnapInterview
          </p>

        </div>
      </div>
    </footer>
  );
}
