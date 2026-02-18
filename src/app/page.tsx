import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  // Check if user has an active session
  const session = await getServerSession();
  
  // If they do, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-[family-name:var(--font-geist-sans)]">
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
      <section className="relative flex flex-col items-center px-6 pt-36 pb-24 text-center">
        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Now with AI‑powered feedback
        </span>

        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
          Interview prep that
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-400 bg-clip-text text-transparent">
            actually works.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-500">
          Practice realistic mock interviews, receive instant AI feedback, and
          track your progress — so you walk in confident on the day that
          matters.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-xl bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl"
          >
            Start Practicing — It&apos;s Free
          </Link>
          <a
            href="#how-it-works"
            className="group flex items-center gap-2 rounded-xl border border-zinc-200 px-7 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50"
          >
            See How It Works
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Hero visual — a minimal browser mockup */}
        <div className="mx-auto mt-20 w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl shadow-zinc-200/60">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="mx-auto block w-56 rounded-md bg-zinc-100 px-3 py-1 text-center text-[11px] text-zinc-400">
              snapinterview.app/practice
            </span>
          </div>
          {/* Mock content */}
          <div className="grid gap-6 p-8 sm:grid-cols-3">
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm border border-zinc-100">
              <div className="h-3 w-20 rounded bg-zinc-200" />
              <div className="h-2 w-full rounded bg-zinc-100" />
              <div className="h-2 w-4/5 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-zinc-900" />
            </div>
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm border border-zinc-100">
              <div className="h-3 w-24 rounded bg-zinc-200" />
              <div className="h-2 w-full rounded bg-zinc-100" />
              <div className="h-2 w-3/4 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-emerald-500" />
            </div>
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm border border-zinc-100">
              <div className="h-3 w-16 rounded bg-zinc-200" />
              <div className="h-2 w-full rounded bg-zinc-100" />
              <div className="h-2 w-5/6 rounded bg-zinc-100" />
              <div className="mt-4 h-8 w-full rounded-lg bg-zinc-300" />
            </div>
          </div>
        </div>
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

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                ),
                title: "AI Interviewer",
                desc: "Our AI adapts in real time, asking follow-ups just like a real interviewer would.",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: "Instant Feedback",
                desc: "Get a detailed scorecard after every session — strengths, weak spots, and how to improve.",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                title: "Question Library",
                desc: "Thousands of curated questions across industries — behavioral, technical, and case study.",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
                title: "Video Recording",
                desc: "Record your sessions, replay them, and catch every detail you missed in the moment.",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                ),
                title: "Progress Tracking",
                desc: "Visualize your improvement over weeks with detailed analytics and performance charts.",
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "24 / 7 Access",
                desc: "Practice on your schedule — morning, night, or five minutes before the real thing.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-zinc-100 bg-white p-7 transition-all hover:border-zinc-200 hover:shadow-lg hover:shadow-zinc-100"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="bg-zinc-50 py-28 px-6 border-y border-zinc-100">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
            How It Works
          </p>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps to interview confidence
          </h2>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
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
              <div key={s.step} className="relative">
                <span className="mb-4 block text-5xl font-extrabold text-zinc-300">
                  {s.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20 px-6">
        <div className="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-3">
          {[
            { value: "50k+", label: "Mock Interviews Completed" },
            { value: "93%", label: "Users Report More Confidence" },
            { value: "4.9/5", label: "Average User Rating" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="pricing" className="px-6 pb-28">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-zinc-900 px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to nail your next interview?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-zinc-400">
            Join thousands of candidates who went from nervous to confident.
            Start free — no credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-7 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 px-7 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </div>
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
