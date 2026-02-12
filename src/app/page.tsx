
import { Hero } from "@/components/home/Hero";
import { Footer } from "@/components/home/Footer";
import { InfoSection } from "@/components/home/InfoSection";
import { Suburban } from "@/components/home/Suburban";
import { Testimonials } from "@/components/home/Testimonials";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black">
      <Hero />
      <InfoSection />
      <Suburban />
      <Testimonials />
      <Footer />
    </main>
  );
}
