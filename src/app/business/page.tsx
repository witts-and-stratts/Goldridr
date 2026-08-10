"use client";

import Image from "next/image";
import Link from "next/link";
import { Hero, type HeroSlide } from "@/components/home/Hero";
import { Footer } from "@/components/home/Footer";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/marketing/ServiceCard";
import { StandardItem } from "@/components/marketing/StandardItem";

import { useBookingOverlay } from "@/components/booking/BookingContext";

const BUSINESS_HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: "/assets/images/business-hero-event-chauffeur.webp",
    alt: "Corporate transportation",
    title: "ARRIVE IN STYLE, EVERY TIME",
    description: "Efficiency, reliability, and precision for your business needs. Manage your Houston corporate transportation with a partner you can trust.",
    cta: "GET STARTED",
  },
];

export default function BusinessPage() {
  const { setIsOpen } = useBookingOverlay();

  return (
    <main className="site-page">
      <Hero slides={ BUSINESS_HERO_SLIDES } ariaLabel="GoldRidrbusiness services" />

      {/* Corporate Services */ }
      <section className="site-content py-20 md:py-24">
        <h2 className="site-heading mb-8 md:mb-16">
          CORPORATE SERVICES
        </h2>
        <p className="site-copy mb-16 max-w-[725px] leading-7">
          From executive transfers to company-wide logistics, we deliver
          dependable corporate transportation designed to keep your business
          moving seamlessly across Houston and beyond.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <ServiceCard
            iconSrc="/assets/images/icon/airplane.svg"
            title="EXECUTIVE TRANSFERS"
            description="Punctual, discreet service for C-suite executives and VIP clients. Flight tracking ensures we are there when you land."
            className="size-18"
          />
          <ServiceCard
            iconSrc="/assets/images/icon/city.svg"
            title="MEETINGS & EVENTS"
            description="Comprehensive logistics support for roadshows, conferences, and company events across all of Houston."
          />
          <ServiceCard
            iconSrc="/assets/images/icon/clock.svg"
            title="EMPLOYEE COMMUTES"
            description="Safe, reliable shuttle services to keep your workforce moving efficiently between Sugar Land, The Woodlands, and Downtown."
          />
          <ServiceCard
            iconSrc="/assets/svg/star.svg"
            title="RIDES FOR YOUR CUSTOMERS"
            description="Impress your clients with VIP transport. We handle the logistics so you can focus on the relationship."
          />
          <ServiceCard
            iconSrc="/assets/images/icon/luggage.svg"
            title="DELIVERY AND LOGISTICS"
            description="Secure and timely delivery of important documents, packages, and sensitive materials across Houston."
          />
        </div>
      </section>

      {/* Why Partner With Us — Light Section */ }
      <section className="relative bg-[#d9d9d9]">
        <div className="relative top-0 left-0 right-0 min-h-[50vh]">
          <Image
            src="/assets/images/business-partnership-chauffeur.webp"
            alt="Corporate Partnership"
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black/50 to-transparent">
            <h2 className="site-heading site-heading--display absolute bottom-8 px-8 text-white md:px-12">
              WHY PARTNER
              <br />
              WITH US
            </h2>
          </div>
        </div>

        <div className="site-content relative z-10">
          <p className="site-copy site-copy--dark mb-20 max-w-[725px] py-8 leading-7">
            We go beyond transportation. Our corporate program is built around
            accountability, transparency, and the kind of personal attention that
            only an owner-operated service can deliver.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 md:mb-40">
            <StandardItem
              src="/assets/svg/shield.svg"
              title="Duty of Care"
              description="Safety is non-negotiable. Our rigorous vetting process and insurance standards provide total peace of mind for your team."
            />
            <StandardItem
              src="/assets/svg/map.svg"
              title="Local Mastery"
              description="Deep knowledge of Houston's traffic patterns, airports, and business districts ensures punctual and efficient travel."
              className="size-17"
            />
            <StandardItem
              src="/assets/svg/bill.svg"
              title="Streamlined Billing"
              description="Centralized management, detailed reporting, and flexible billing options designed to integrate with your expense platforms."
              className="size-18"
            />
            <StandardItem
              src="/assets/svg/support.svg"
              title="Dedicated Support"
              description="A single point of contact for your account. We adapt to your schedule, preferences, and evolving business needs."
              className="size-18"
            />
          </div>
        </div>
      </section>

      {/* CTA */ }
      <section className="site-content py-12 md:py-32">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="site-heading mb-6">
              Ready to Elevate
              <br />
              Your Corporate Travel?
            </h2>
            <p className="site-copy mb-10 max-w-[500px] leading-7">
              Contact our specialized corporate team to discuss your specific
              requirements and set up your account. We&apos;ll tailor a solution
              that fits your business.
            </p>
            <div className="flex flex-wrap gap-4 max-md:w-full">
              <Link href="/contact" className="max-md:w-full">
                <Button variant={ 'outline' } size={ 'lg' } className={ 'max-md:w-full' }>
                  GET STARTED
                </Button>
              </Link>
              <Button
                onClick={ () => setIsOpen( true ) }
                size={ 'lg' }
                variant={ 'outline' }
                className={ 'max-md:w-full' }
              // className="border border-gold/40 text-gold px-6 py-2 font-wide text-sm tracking-[0.2em] hover:bg-gold/10 transition-colors min-w-[220px]"
              >
                BOOK A RIDE NOW
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <StatItem number="24/7" label="Availability" />
            <StatItem number="100%" label="Flight Tracking" />
            <StatItem number="6" label="Passenger Capacity" />
            <StatItem number="1" label="Point of Contact" />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function StatItem( { number, label }: { number: string; label: string; } ) {
  return (
    <div className="border border-white/10 p-4 md:p-8 flex flex-col items-start">
      <span className="font-serif text-3xl md:text-4xl text-gold mb-2">{ number }</span>
      <span className="font-wide text-sm tracking-[0.2em] text-gray-400 uppercase">{ label }</span>
    </div>
  );
}
