import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SnapInterview",
    applicationCategory: "EducationalApplication",
    operatingSystem: "All",
    url: "https://snapinterview.app",
    description: "Practice mock interviews with AI, get instant feedback, and land your dream job with confidence.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: "SnapInterview",
      url: "https://snapinterview.app",
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4f9ff_0%,#fcfeff_18%,#ffffff_42%,#f7fbff_100%)] text-zinc-900 font-(family-name:--font-geist-sans)">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
