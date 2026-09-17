import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/hero/Hero";
import { ChannelStrip } from "@/components/ChannelStrip";
import { ChannelsSection } from "@/components/ChannelsSection";
import { DashboardSection } from "@/components/DashboardSection";
import { AutomationSection } from "@/components/AutomationSection";
import { DeveloperSection } from "@/components/DeveloperSection";
import { UseCasesSection } from "@/components/UseCasesSection";
import { WhySection } from "@/components/WhySection";
import { PricingSection } from "@/components/PricingSection";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ChannelStrip />
        <ChannelsSection />
        <DashboardSection />
        <AutomationSection />
        <DeveloperSection />
        <UseCasesSection />
        <WhySection />
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
