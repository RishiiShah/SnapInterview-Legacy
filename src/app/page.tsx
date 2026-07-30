import { headers } from "next/headers";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingAtmosphere from "@/components/landing/LandingAtmosphere";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SocialProofSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default async function LandingPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SnapInterview",
    applicationCategory: "EducationalApplication",
    operatingSystem: "All",
    url: "https://snapinterview.app",
    description:
      "Practice realistic AI mock interviews with video recording, adaptive follow-ups, transcripts, and automated scoring.",
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
    <div className="landing-page relative min-h-screen overflow-x-hidden bg-[#090A0F] font-sans text-[#F5F7FF] selection:bg-blue-600 selection:text-white">
      <LandingAtmosphere />

      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNavbar />
      <main className="relative z-10 w-full">
        <HeroSection />
        <FeaturesSection />
        <SocialProofSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
