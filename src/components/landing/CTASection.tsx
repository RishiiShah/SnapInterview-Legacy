import Link from "next/link";

export default function CTASection() {
  return (
    <section id="get-started" className="landing-section pb-20">
      <div className="landing-container">

        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] px-8 py-16 sm:px-14 sm:py-20">

          {/* Background accent — single clean glow, bottom-right */}
          <div
            className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.22)_0%,transparent_70%)] blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1)_0%,transparent_70%)] blur-3xl"
            aria-hidden="true"
          />

          {/* Editorial content */}
          <div className="relative max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#3D4F73]">
              03 / Get started
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.035em] text-[#F5F7FF]">
              Your next interview
              <br />
              <span className="text-[#6B7A96] font-normal">is the one that matters.</span>
            </h2>
            <p className="mt-5 max-w-md text-[clamp(0.92rem,1.3vw,1rem)] leading-relaxed text-[#6B7A96]">
              Free account. No tiers to choose. Start a session in your browser right now — then review your recording
              when you're done.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/signup" className="landing-hero-cta-primary">
                <span className="landing-hero-cta-meters" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Create free account
                <span className="landing-hero-cta-arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="/login" className="landing-hero-cta-secondary">
                Sign in
                <span className="landing-hero-cta-secondary-mark" aria-hidden="true">↳</span>
              </Link>
            </div>

            <p className="mt-6 text-xs text-[#3D4F73]">
              No credit card required · Works in any modern browser
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
