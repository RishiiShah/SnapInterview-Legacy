import Image from "next/image";
import Link from "next/link";
import HeroWorkspace from "./HeroWorkspace";

export default function HeroSection() {
  return (
    <section
      id="home"
      className="landing-hero relative flex min-w-0 flex-col overflow-x-clip"
      style={{ minHeight: "100svh" }}
    >
      {/* ── Full-bleed illustrated background ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          quality={90}
          className="object-cover object-center"
          aria-hidden="true"
        />

        {/* Layered overlays — darken image so text stays crisp */}
        {/* Base darkening */}
        <div className="absolute inset-0 bg-[#020B21]/40" />
        {/* Bottom-up gradient: text reading zone */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020B21] via-[#020B21]/70 to-transparent" style={{ background: "linear-gradient(to top, #020B21 0%, rgba(2,11,33,0.82) 28%, rgba(2,11,33,0.45) 55%, transparent 80%)" }} />
        {/* Left-side vignette so left-aligned text always readable */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(2,11,33,0.65) 0%, rgba(2,11,33,0.20) 40%, transparent 70%)" }} />
        {/* Smooth page-bg continuation at very bottom */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-[#020B21]" />
      </div>

      {/* ── Hero copy — bottom-left anchored ── */}
      <div
        className="relative z-10 flex flex-1 flex-col justify-end landing-container"
        style={{ paddingBottom: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        <div className="max-w-[44rem]">
          {/* Headline */}
          <h1
            className="landing-hero-copy break-words font-bold leading-[1.0] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5.2rem)" }}
          >
            The interview
            <br />
            you{" "}
            <span className="landing-hero-accent">never had</span>
            <span className="block mt-2 font-normal tracking-[-0.02em] text-white/30" style={{ fontSize: "clamp(1.3rem, 2.5vw, 2.2rem)" }}>
              — until now.
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="mt-5 max-w-[34rem] leading-[1.75] text-white/55"
            style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.05rem)" }}
          >
            A mock interview that actually pushes back. Speak your answer out
            loud, get real follow-ups, then replay the whole thing with a
            transcript and score before you walk into the real room.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="landing-hero-cta-primary">
              <span className="landing-hero-cta-meters" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              Start practicing free
              <span className="landing-hero-cta-arrow" aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="landing-hero-cta-secondary">
              See how it works
              <span className="landing-hero-cta-secondary-mark" aria-hidden="true">↳</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── HeroWorkspace below the illustrated zone ── */}
      <div className="relative z-10 w-full bg-[#020B21]">
        <HeroWorkspace />
      </div>
    </section>
  );
}
