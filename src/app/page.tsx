import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-(family-name:--font-geist-sans)">
      <LandingNavbar />
      
      <HeroSection />

      <FeaturesSection />

      <HowItWorksSection />

      <CTASection />

      <LandingFooter />
    </div>
  );
}
