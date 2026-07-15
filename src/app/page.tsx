
import { Hero } from "@/components/home/Hero";
import { Footer } from "@/components/home/Footer";
import { InfoSection } from "@/components/home/InfoSection";
import { Suburban } from "@/components/home/Suburban";
import { TransportationServices } from "@/components/home/TransportationServices";
import { Testimonials } from "@/components/home/Testimonials";

export default function Home() {
  return (
    <main className="site-page">
      <Hero />
      <InfoSection />
      <Suburban />
      <TransportationServices />
      <Testimonials />
      <Footer />
    </main>
  );
}
