import Link from "next/link";

export default function LandingNavbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold leading-none tracking-tighter text-white">
            SI
          </div>
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
          <a href="#pricing" className="transition-colors hover:text-zinc-900">
            Pricing
          </a>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
