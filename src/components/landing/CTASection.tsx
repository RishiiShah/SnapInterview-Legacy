import Link from "next/link";
import { LandingFadeIn } from "./LandingMotion";

export default function CTASection() {
  return (
    <section id="get-started" className="landing-section relative">
      <LandingFadeIn
        triggerOnView
        data-landing-reveal
        className="relative mx-auto max-w-3xl rounded-3xl border border-white/15 px-6 py-12 text-center sm:px-10 sm:py-14"
        style={{
          background:
            "linear-gradient(160deg, rgba(76,29,149,0.28) 0%, rgba(20,33,61,0.7) 45%, rgba(12,20,40,0.85) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 60px rgba(79,70,229,0.2)",
        }}
      >
        <div
          data-landing-cta-aura
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-[linear-gradient(120deg,rgba(76,29,149,0.18),rgba(34,211,238,0.08),rgba(37,99,235,0.18))] bg-[length:200%_200%] motion-safe:animate-[landingGradientShift_18s_ease-in-out_infinite]"
        />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight text-[#F5F7FF] sm:text-4xl">
            Ready to practice?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#8E97AB] sm:text-base">
            Create a free account, start a mock interview in your browser, and review your recording when
            you&apos;re done. No pricing tiers to pick — just get started.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] transition-opacity hover:opacity-95 sm:h-12 sm:text-base"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-[#F5F7FF] transition-colors hover:bg-white/10 sm:h-12"
            >
              Log in
            </Link>
          </div>
        </div>
      </LandingFadeIn>
    </section>
  );
}
