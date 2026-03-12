import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import StatsSection from "@/components/landing/StatsSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-(family-name:--font-geist-sans)">
      <LandingNavbar />
      
      <HeroSection />

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

      <FeaturesSection />

      <HowItWorksSection />

      <StatsSection />

      <CTASection />

      <LandingFooter />
    </div>
  );
}
