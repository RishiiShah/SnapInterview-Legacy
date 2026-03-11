import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/server-auth";
import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";
import {
  IconBookOpen,
  IconChartBars,
  IconChevronRight,
  IconClock,
  IconStarBurst,
  IconTrendingUp,
  IconVideoCamera,
} from "@/components/ui/icons";

export default async function LandingPage() {
  // Check if user has an active session
  const session = await getServerAuthSession();

  // If they do, redirect to dashboard
  if (session) {
    redirect(session.user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-(family-name:--font-geist-sans)">
      {/* ─── Navbar ─── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold leading-none tracking-tighter text-white">
              SI
            </div>
            <span className="text-lg font-semibold tracking-tight">
              SnapInterview
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
            <a href="#features" className="transition-colors hover:text-zinc-900">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-zinc-900">
              How It Works
            </a>
            <a href="#pricing" className="transition-colors hover:text-zinc-900">
              Pricing
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center px-6 pt-36 pb-24 text-center overflow-hidden">
        {/* Badge */}
        <SlideIn delay={0.1}>
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Now with AI‑powered feedback
          </span>
        </SlideIn>

        <SlideIn delay={0.2}>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            Interview prep that
            <br className="hidden sm:block" />
            <span className="bg-linear-to-r from-zinc-900 via-zinc-600 to-zinc-400 bg-clip-text text-transparent">
              actually works.
            </span>
          </h1>
        </SlideIn>

        <SlideIn delay={0.3}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-500">
            Practice realistic mock interviews, receive instant AI feedback, and
            track your progress — so you walk in confident on the day that
            matters.
          </p>
        </SlideIn>

        <SlideIn delay={0.4}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-xl bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:-translate-y-0.5"
            >
              <span className="relative z-10">Start Practicing — It&apos;s Free</span>
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
          <div className="mx-auto mt-20 w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl shadow-zinc-200/60 ring-1 ring-zinc-900/5 transition-transform hover:scale-[1.01] duration-500">
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

      {/* ─── Logos / Social Proof ─── */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-12">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Trusted by candidates at
        </p>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-14 gap-y-6 px-6 text-zinc-500">
          {["Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix"].map(
            (name) => (
              <span
                key={name}
                className="text-lg font-semibold tracking-tight"
              >
                {name}
              </span>
            )
          )}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <FadeIn direction="up">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Features
            </p>
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to prepare
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
              From AI mock interviews to detailed analytics — we give you the
              full toolkit to outperform the competition.
            </p>
          </FadeIn>

          <FadeInStagger className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <IconStarBurst className="h-5 w-5" />,
                title: "AI Interviewer",
                desc: "Our AI adapts in real time, asking follow-ups just like a real interviewer would.",
              },
              {
                icon: <IconChartBars className="h-5 w-5" />,
                title: "Instant Feedback",
                desc: "Get a detailed scorecard after every session — strengths, weak spots, and how to improve.",
              },
              {
                icon: <IconBookOpen className="h-5 w-5" />,
                title: "Question Library",
                desc: "Thousands of curated questions across industries — behavioral, technical, and case study.",
              },
              {
                icon: <IconVideoCamera className="h-5 w-5" strokeWidth={1.5} />,
                title: "Video Recording",
                desc: "Record your sessions, replay them, and catch every detail you missed in the moment.",
              },
              {
                icon: <IconTrendingUp className="h-5 w-5" />,
                title: "Progress Tracking",
                desc: "Visualize your improvement over weeks with detailed analytics and performance charts.",
              },
              {
                icon: <IconClock className="h-5 w-5" />,
                title: "24 / 7 Access",
                desc: "Practice on your schedule — morning, night, or five minutes before the real thing.",
              },
            ].map((f) => (
              <FadeInStaggerItem key={f.title}>
                <div className="group h-full rounded-2xl border border-zinc-100 bg-white p-7 transition-all hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-100 hover:-translate-y-1">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    {f.desc}
                  </p>
                </div>
              </FadeInStaggerItem>
            ))}
          </FadeInStagger>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="bg-zinc-50 py-28 px-6 border-y border-zinc-100">
        <div className="mx-auto max-w-6xl">
          <FadeIn direction="up">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
              How It Works
            </p>
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps to interview confidence
            </h2>
          </FadeIn>

          <FadeInStagger className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick Your Role",
                desc: "Choose from hundreds of job roles and difficulty levels. We tailor every session to your target position.",
              },
              {
                step: "02",
                title: "Practice with AI",
                desc: "Jump into a realistic mock interview. Our AI asks questions, listens, and responds — just like a real panel.",
              },
              {
                step: "03",
                title: "Review & Improve",
                desc: "Get an instant scorecard with actionable tips. Track your scores over time and watch yourself improve.",
              },
            ].map((s) => (
              <FadeInStaggerItem key={s.step} className="relative group">
                <span className="mb-4 block text-5xl font-extrabold text-zinc-300 transition-colors group-hover:text-zinc-900">
                  {s.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {s.desc}
                </p>
              </FadeInStaggerItem>
            ))}
          </FadeInStagger>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20 px-6">
        <FadeInStagger className="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-3">
          {[
            { value: "50k+", label: "Mock Interviews Completed" },
            { value: "93%", label: "Users Report More Confidence" },
            { value: "4.9/5", label: "Average User Rating" },
          ].map((s) => (
            <FadeInStaggerItem key={s.label}>
              <p className="text-4xl font-bold tracking-tight text-zinc-900">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </section>

      {/* ─── CTA ─── */}
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

      {/* ─── Footer ─── */}
      <footer className="border-t border-zinc-100 bg-white py-12 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-zinc-900 text-[10px] font-bold leading-none tracking-tighter text-white">
              SI
            </div>
            <span className="text-sm font-semibold tracking-tight">
              SnapInterview
            </span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-400">
            <a href="#" className="transition-colors hover:text-zinc-600">Privacy</a>
            <a href="#" className="transition-colors hover:text-zinc-600">Terms</a>
            <a href="#" className="transition-colors hover:text-zinc-600">Contact</a>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} SnapInterview. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
