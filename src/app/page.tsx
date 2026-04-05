import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4f9ff_0%,#fcfeff_18%,#ffffff_42%,#f7fbff_100%)] text-zinc-900 font-(family-name:--font-geist-sans)">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,#6fd4ff1f_0,#6fd4ff08_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,transparent_0,transparent_47%,rgba(115,198,255,0.045)_50%,transparent_53%,transparent_100%)] opacity-60" />
      <LandingNavbar />
      
      <HeroSection />

      <FeaturesSection />

      <HowItWorksSection />

      <CTASection />

      <LandingFooter />
    </div>
  );
}
