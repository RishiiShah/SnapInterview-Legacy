import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";

export default function CTASection() {
  return (
    <section className="px-6 py-24 md:px-12">
      <FadeIn direction="up">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#041321,#0d2144_38%,#0f6dfc_100%)] px-8 py-16 text-center text-white shadow-[0_44px_90px_-54px_rgba(15,109,252,0.65)] sm:px-16">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-sky-400/18 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <h2 className="relative z-10 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight">
            Start practicing with interview reps that actually teach you something.
          </h2>
          <p className="relative z-10 mx-auto mt-6 max-w-2xl text-[clamp(1rem,1.5vw,1.125rem)] leading-relaxed text-sky-100/78">
            Build better answers, hear better follow-ups, and walk into the real interview already calibrated.
          </p>
          <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-8 py-4 text-[15px] font-semibold text-zinc-950 shadow-[0_18px_40px_-24px_rgba(255,255,255,0.55)] transition-all hover:-translate-y-0.5 hover:bg-sky-50"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/18 bg-white/7 px-8 py-4 text-[15px] font-semibold text-sky-100 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/12 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
