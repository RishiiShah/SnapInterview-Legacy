import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";

export default function CTASection() {
  return (
    <section id="pricing" className="px-6 pb-28">
      <FadeIn direction="up">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-zinc-900 px-8 py-16 text-center text-white sm:px-16 shadow-2xl relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-zinc-800 opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <h2 className="relative z-10 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to nail your next interview?
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-md text-zinc-400">
            Join thousands of candidates who went from nervous to confident.
            Start free — no credit card required.
          </p>
          <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-7 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl hover:-translate-y-0.5"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 px-7 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              Sign In
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
