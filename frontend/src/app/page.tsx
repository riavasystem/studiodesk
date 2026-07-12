import CtaFooter from "@/components/landing/cta-footer";
import Features from "@/components/landing/features";
import Hero from "@/components/landing/hero";
import Stats from "@/components/landing/stats";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-background">
      <Hero />
      <Features />
      <Stats />
      <CtaFooter />
    </main>
  );
}
