import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";

export default function CTASection() {
  return (
    <section className="px-6 md:px-12 py-24">
      <FadeIn direction="up">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-zinc-900 px-8 py-16 text-center text-white sm:px-16 shadow-2xl relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-zinc-800 opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <h2 className="relative z-10 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight">
            Ready to nail your next interview?
          </h2>
          <p className="relative z-10 mx-auto mt-6 max-w-2xl text-[clamp(1rem,1.5vw,1.125rem)] text-zinc-400 leading-relaxed">
            Join thousands of candidates who went from nervous to confident.
            Start practicing today.
          </p>
          <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-8 py-4 text-[15px] font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl hover:-translate-y-0.5"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-8 py-4 text-[15px] font-semibold text-zinc-300 backdrop-blur-sm transition-all hover:border-zinc-500 hover:bg-zinc-800 hover:text-white hover:-translate-y-0.5"
            >
              Sign In
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
