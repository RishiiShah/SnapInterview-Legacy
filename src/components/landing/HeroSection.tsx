import Link from "next/link";
import HeroWorkspace from "./HeroWorkspace";

function AuroraBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[8%] h-[clamp(22rem,58svh,40rem)] overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.3)_0%,rgba(37,99,235,0.15)_40%,transparent_70%)] blur-3xl" />
      <div className="absolute left-[5%] top-[20%] h-[55%] w-[40%] rotate-[-18deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(192,132,252,0.4)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute right-0 top-[10%] h-[60%] w-[45%] rotate-[12deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.35)_0%,rgba(59,130,246,0.2)_45%,transparent_70%)] blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 1200 400" fill="none" preserveAspectRatio="none">
        <path
          d="M-40 260 C 200 80, 420 320, 640 180 S 980 60, 1240 200"
          stroke="url(#aurora1)"
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.5"
          filter="url(#auroraBlur)"
        />
        <path
          d="M-20 300 C 240 140, 480 340, 720 220 S 1040 100, 1240 240"
          stroke="url(#aurora2)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.4"
          filter="url(#auroraBlur)"
        />
        <defs>
          <linearGradient id="aurora1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="aurora2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <filter id="auroraBlur">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section id="home" className="landing-hero relative flex flex-col items-center">
      <AuroraBackground />

      <div className="relative z-10 w-full landing-container text-center">
        <h1 className="mx-auto max-w-4xl text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-[#F5F7FF]">
          Practice real interviews with{" "}
          <span className="bg-gradient-to-r from-[#A78BFA] via-[#818CF8] to-[#22D3EE] bg-clip-text text-transparent">
            AI that talks back
          </span>
        </h1>

        <p className="mx-auto mt-[clamp(1.25rem,2.5vw,1.75rem)] max-w-2xl text-[clamp(0.95rem,1.5vw,1.15rem)] leading-relaxed text-[#8E97AB]">
          Customize a mock interview for your role, explain your thinking out loud, then review the recording,
          transcript, test results, and score before the real thing.
        </p>

        <div className="mt-[clamp(1.5rem,3vw,2rem)] flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-[clamp(2.75rem,4vw,3rem)] items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] px-[clamp(1.25rem,2.5vw,1.75rem)] text-sm font-semibold text-white shadow-[0_0_28px_rgba(79,70,229,0.45)] transition-opacity hover:opacity-95 sm:text-base"
          >
            Start practicing free
            <span aria-hidden="true">→</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex h-[clamp(2.75rem,4vw,3rem)] items-center rounded-xl border border-white/15 bg-white/5 px-[clamp(1rem,2vw,1.25rem)] text-sm font-medium text-[#F5F7FF] transition-colors hover:bg-white/10"
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="relative z-10 w-full">
        <HeroWorkspace />
      </div>
    </section>
  );
}
