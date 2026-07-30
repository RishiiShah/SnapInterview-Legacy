import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, Video, Cpu, Zap, ShieldCheck } from "lucide-react";

export default function CTASection() {
  return (
    <section id="get-started" className="landing-section relative z-10 bg-[#090A0F] pt-4 pb-12 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0F1A] px-8 pt-10 pb-10 sm:px-14 text-center">

          <div className="flex flex-col items-center">

            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              Start Practicing Today
            </span>

            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.03em] text-white sm:text-4xl max-w-xl">
              Your next interview won&apos;t be your first.
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[#64748B] max-w-lg">
              Create a free account, start a session in your browser, and review your recording when done. No credit card required.
            </p>

            {/* Live Session Preview Widget */}
            <div aria-hidden="true" className="mt-6 w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#070912] p-4 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs text-[#CBD5E1]">Live Practice Session</span>
                </div>
                <div className="flex items-center gap-3 text-[0.7rem]">
                  <span className="flex items-center gap-1 text-emerald-400"><Mic className="h-3 w-3" /> Mic Active</span>
                  <span className="flex items-center gap-1 text-sky-400"><Video className="h-3 w-3" /> 1080p</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 text-[#CBD5E1]">
                  <Cpu className="h-3.5 w-3.5 text-violet-400" />
                  AI Evaluator: <strong className="text-white ml-1">Active</strong>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 text-[#CBD5E1]">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Response: <strong className="text-white ml-1">18ms</strong>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 text-[#CBD5E1]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Rubric Alignment: <strong className="text-white ml-1">94%</strong>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer shadow-md"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
              >
                Sign in to existing account
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Works in any browser
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No credit card needed
              </span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
