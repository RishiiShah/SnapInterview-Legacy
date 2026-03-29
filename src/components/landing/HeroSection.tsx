import Link from "next/link";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import { IconChevronRight } from "@/components/ui/icons";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center items-center px-6 md:px-12 pt-32 pb-20 text-center overflow-hidden">
      {/* Badge */}
      <SlideIn delay={0.1}>
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          AI-powered interview practice
        </span>
      </SlideIn>

      <SlideIn delay={0.2}>
        <h1 className="mx-auto max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.1] tracking-tight text-zinc-900">
          A practice platform for
          <br className="hidden sm:block" />
          technical interviews.
        </h1>
      </SlideIn>

      <SlideIn delay={0.3}>
        <p className="mx-auto mt-6 max-w-2xl text-[clamp(1.125rem,2vw,1.375rem)] leading-relaxed text-zinc-500">
          Practice technical and behavioral interviews with straightforward AI
          feedback. Refine your responses and build confidence for your next
          interview.
        </p>
      </SlideIn>

      <SlideIn delay={0.4}>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="group relative overflow-hidden rounded-xl bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:-translate-y-0.5"
          >
            <span className="relative z-10">Start Practicing</span>
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </Link>
          <a
            href="#how-it-works"
            className="group flex items-center gap-2 rounded-xl border border-zinc-200 px-7 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:-translate-y-0.5"
          >
            See How It Works
            <IconChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-zinc-900"
              strokeWidth={2.5}
            />
          </a>
        </div>
      </SlideIn>

      {/* Hero visual — a minimal browser mockup */}
      <FadeIn delay={0.6} direction="up" className="w-full relative z-10">
        <div className="mx-auto mt-16 w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl shadow-zinc-200/60 ring-1 ring-zinc-900/5 transition-transform hover:scale-[1.01] duration-500">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 bg-white/50 backdrop-blur-sm">
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="mx-auto block w-56 rounded-md bg-zinc-100/50 px-3 py-1 text-center text-[11px] text-zinc-400 font-mono tracking-tight">
              snapinterview.app/practice
            </span>
          </div>
          {/* Mock content */}
          <div className="grid gap-6 p-8 sm:grid-cols-3 bg-zinc-50/50">
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm border border-zinc-100/80 transition-shadow hover:shadow-md">
              <div className="h-3 w-20 rounded bg-zinc-200 animate-pulse" />
              <div className="h-2 w-full rounded bg-zinc-100" />
              <div className="h-2 w-4/5 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-zinc-900" />
            </div>
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm border border-zinc-100/80 transition-shadow hover:shadow-md">
              <div className="h-3 w-24 rounded bg-zinc-200 animate-pulse" />
              <div className="h-2 w-full rounded bg-zinc-100" />
              <div className="h-2 w-3/4 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-emerald-500" />
            </div>
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm border border-zinc-100/80 transition-shadow hover:shadow-md">
              <div className="h-3 w-16 rounded bg-zinc-200 animate-pulse" />
              <div className="h-2 w-full rounded bg-zinc-100" />
              <div className="h-2 w-5/6 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-zinc-300" />
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
