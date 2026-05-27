import Link from "next/link";
import Image from "next/image";

export default function LandingNavbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5">
          <Image src="/logo.png" alt="SnapInterview Logo" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">
            SnapInterview
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
          <a href="#features" className="transition-colors hover:text-zinc-900">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-zinc-900">
            How It Works
          </a>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-all hover:text-zinc-900 hover:bg-zinc-100 sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[linear-gradient(135deg,#149dff,#0f6dfc)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_-18px_rgba(20,157,255,0.9)] transition-all hover:-translate-y-0.5 hover:brightness-105"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
