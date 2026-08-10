"use client";

import Image from "next/image";
import { Hero, type HeroSlide } from "@/components/home/Hero";
import { Footer } from "@/components/home/Footer";
import { Suburban } from "@/components/home/Suburban";
import { ServiceCard } from "@/components/marketing/ServiceCard";
import { StandardItem } from "@/components/marketing/StandardItem";

const RIDE_HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: "/assets/images/ridr-elegant-client.jpg",
    alt: "Luxury chauffeur service",
    title: "YOUR PERSONAL CHAUFFEUR",
    description: "Experience the pinnacle of chauffeured services. Where every journey is crafted with precision, comfort, and elegance.",
    cta: "BOOK YOUR RIDE",
  },
];

export default function RidePage() {
  return (
    <main className="site-page">
      <Hero slides={ RIDE_HERO_SLIDES } ariaLabel="GoldRidrride services" />

      {/* Our Services */ }
      <section className="site-content py-10 md:py-24">
        <h2 className="site-heading site-heading--display mb-8 md:mb-16">
          OUR SERVICES
        </h2>
        <p className="site-copy mb-16 max-w-[725px] leading-7">
          From short rides to long-distance travel, arrivals or departures, we
          use smart technology to make your experience seamless—while keeping our
          service professional without stiffness, attentive without intrusion,
          and warm without losing its edge.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <ServiceCard
            iconSrc="/assets/images/icon/airplane.svg"
            title="AIRPORT TRANSFERS"
            description="Reliable, comfortable transfers to and from all major airports. Flight tracking ensures we are there when you land."
            className="size-18"

          />
          <ServiceCard
            iconSrc="/assets/images/icon/city.svg"
            title="CITY TRIPS"
            description="Enjoy the freedom of having a chauffeur at your disposal for as long as you need. Perfect for meetings or shopping trips."
          />
          <ServiceCard
            iconSrc="/assets/images/icon/clock.svg"
            title="HOURLY TRIPS"
            description="Enjoy the freedom of having a chauffeur at your disposal for as long as you need. Perfect for meetings or shopping trips."
          />
        </div>
      </section>

      <Suburban showFeatureTag />

      {/* Uncompromising Standards */ }
      <section className="relative bg-[#d9d9d9]">
        <div className="relative top-0 left-0 right-0 min-h-[50vh]">
          <Image
            src="/assets/images/ride-standards-chauffeur-arrival.webp"
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black/50 to-transparent" >
            <h2 className="site-heading site-heading--display absolute bottom-8 px-8 text-white md:px-12">
              UNCOMPROMISING
              <br />
              STANDARDS
            </h2>
          </div>
        </div>

        <div className="site-content relative z-10">
          <p className="site-copy site-copy--dark mb-20 max-w-[725px] py-8 leading-7">
            From short rides to long-distance travel, arrivals or departures, we
            use smart technology to make your experience seamless—while keeping
            our service professional without stiffness, attentive without
            intrusion, and warm without losing its edge.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 md:mb-40">
            <StandardItem
              src="/assets/svg/shield.svg"
              title="Safe & Personalized"
              description="Direct owner-operator service ensures your safety and preferences are personally handled every time."
            />
            <StandardItem
              src="/assets/svg/chair.svg"
              title="Roomy & Comfortable"
              description="Experience the luxury of space in our latest model Suburbans, designed for your ultimate relaxation."
              className="size-18"
            />
            <StandardItem
              src="/assets/svg/professional.svg"
              title="Professional & Humane"
              description="More than just a driver. Expect courteous, empathetic, and discreet service that treats you with respect."
              className="size-18"
            />
            <StandardItem
              src="/assets/svg/star.svg"
              title="Easy & Efficient Transportation"
              description="Seamless booking, timely arrivals, and optimized routes for a stress-free journey."
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
