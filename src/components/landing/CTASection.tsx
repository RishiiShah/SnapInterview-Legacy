import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function CTASection() {
  return (
    <section id="get-started" className="landing-section py-20 bg-[#090A0F]">
      <div className="landing-container">

        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0F111A] via-[#090A0F] to-[#06070B] p-8 sm:p-14 shadow-2xl">
          
          {/* Ambient radial glows behind card */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-purple-600/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-semibold text-blue-400">
              <Sparkles className="h-3.5 w-3.5" />
              Start practicing in 2 minutes
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl max-w-2xl">
              Ready to ace your next technical or behavioral interview?
            </h2>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#94A3B8]">
              Create a free account, start a mock session in your browser, and review your recording and transcript when done. No credit card required.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-7 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-blue-600/40 hover:scale-[1.02]"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
              >
                Sign in to existing account
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Works in any browser
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> No credit card needed
              </span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
