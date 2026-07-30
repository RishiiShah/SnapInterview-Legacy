import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section id="home" className="relative h-screen min-h-[680px] max-h-[1080px] w-full overflow-hidden bg-[#090A0F]">
      {/* ── High-Resolution Full-Bleed Background Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-starry-bg.jpg"
          alt="Majestic starry night landscape background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
          aria-hidden="true"
        />

        {/* Top gradient overlay for navbar readability */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#090A0F]/80 via-[#090A0F]/30 to-transparent pointer-events-none" />

        {/* Left vignette overlay for headline & body text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(9,10,15,0.88) 0%, rgba(9,10,15,0.55) 42%, transparent 78%)",
          }}
        />

        {/* Bottom gradient fade into page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-72 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, #090A0F 0%, rgba(9,10,15,0.96) 28%, rgba(9,10,15,0.55) 65%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Bottom-Left Anchored Hero Copy (Exact Saasternity / Clonely Layout) ── */}
      <div className="relative z-10 flex h-full flex-col justify-end pb-16 lg:pb-24 landing-container">
        <div className="max-w-3xl">
          {/* Main Headline — Crisp White, Bold, 2 Lines */}
          <h1 className="text-[clamp(2.75rem,5.5vw,4.75rem)] font-bold leading-[1.06] tracking-[-0.035em] text-white">
            Practice real interviews
            <br />
            with AI that talks back.
          </h1>

          {/* Subtext */}
          <p className="mt-4 max-w-xl text-[clamp(1.05rem,1.35vw,1.2rem)] leading-relaxed text-[#94A3B8]">
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
    </section>
  );
}
