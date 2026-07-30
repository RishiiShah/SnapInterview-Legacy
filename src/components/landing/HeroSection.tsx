import Image from "next/image";
import Link from "next/link";
import HeroWorkspace from "./HeroWorkspace";

export default function HeroSection() {
  return (
    <section id="home" className="relative flex min-h-[90vh] flex-col overflow-x-clip bg-[#090A0F]">
      {/* ── Full-Bleed Illustrated Background Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.jpg"
          alt="Atmospheric starry night landscape"
          fill
          priority
          quality={95}
          className="object-cover object-center"
          aria-hidden="true"
        />

        {/* Top gradient overlay for navbar contrast */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#090A0F]/80 via-[#090A0F]/40 to-transparent pointer-events-none" />

        {/* Left vignette overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(9,10,15,0.85) 0%, rgba(9,10,15,0.5) 40%, transparent 75%)",
          }}
        />

        {/* Bottom gradient fade into page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-72 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, #090A0F 0%, rgba(9,10,15,0.95) 30%, rgba(9,10,15,0.6) 65%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Bottom-Left Anchored Hero Content (Saasternity / Clonely Style) ── */}
      <div className="relative z-10 flex min-h-[85vh] flex-col justify-end pb-16 pt-32 landing-container">
        <div className="max-w-3xl">
          {/* Main Headline — Pure, crisp white, bold, 2-line layout */}
          <h1 className="text-[clamp(2.75rem,5.8vw,5rem)] font-bold leading-[1.06] tracking-[-0.035em] text-white">
            Practice real interviews
            <br />
            with AI that talks back.
          </h1>

          {/* Muted Subheadline */}
          <p className="mt-5 max-w-xl text-[clamp(1.05rem,1.35vw,1.2rem)] leading-relaxed text-[#94A3B8]">
            Customize a mock interview for your role, explain your thinking out loud,
            and review your video recording, transcript, and automated score before the real thing.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-blue-600/40 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Try for free today
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center px-4 text-sm font-medium text-[#CBD5E1] transition-colors duration-200 hover:text-white"
            >
              See how it works <span className="ml-1.5 text-xs text-[#60A5FA]">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Interactive Workspace Section (Below Hero Fade) ── */}
      <div className="relative z-10 w-full bg-[#090A0F] pb-12 pt-4">
        <HeroWorkspace />
      </div>
    </section>
  );
}
