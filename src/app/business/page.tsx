"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useBookingOverlay } from "@/components/booking/BookingContext";

export default function BusinessPage() {
  const { setIsOpen } = useBookingOverlay();

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      {/* Hero Section */ }
      <section className="relative h-screen w-full flex justify-center overflow-hidden -mt-40 max-md:h-[120vh]">
        <div className="absolute inset-0">
          <Image
            src="/assets/images/event-chauffeur.jpg"
            alt="Corporate Transportation"
            fill
            className="object-cover h-full w-full"
            quality={ 100 }
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-linear-to-t from-black/50 to-transparent" />
        </div>

        <div className="relative z-10 text-center px-2 md:px-4 mx-auto mt-50">
          <div className="flex flex-col items-center">
            <h1 className="font-serif text-3xl font-medium tracking-wide text-white md:text-5xl">
              ARRIVE IN STYLE, <br className="max-md:hidden" /> EVERY TIME
            </h1>
            <p className="font-light text-sm leading-6 md:text-base md:leading-7 mt-4 mb-12 max-w-[600px] mx-auto">
              Efficiency, reliability, and precision for your business needs.
              Manage your Houston corporate transportation with a partner you can trust.
            </p>
          </div>
          <Button
            onClick={ () => setIsOpen( true ) }
            size={ 'lg' }
            variant={ 'outline' }
            className="bg-black/20 px-6 py-2 font-wide text-sm tracking-[0.2em] transition-colors absolute bottom-20 left-1/2 -translate-x-1/2 min-w-[280px]"
          >
            GET STARTED
          </Button>
        </div>
      </section>

      {/* Corporate Services */ }
      <section className="py-20 md:py-24 px-8 md:px-16 max-w-[1440px] mx-auto w-full">
        <h2 className="font-serif text-3xl md:text-[38px] uppercase md:leading-[52px] mb-8 md:mb-16">
          CORPORATE SERVICES
        </h2>
        <p className="font-light text-base leading-7 max-w-[725px] mb-16">
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
            src="/assets/images/business-man-in-suburban.jpg"
            alt="Corporate Partnership"
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black/50 to-transparent">
            <h2 className="font-serif text-3xl md:text-5xl uppercase text-white px-8 md:px-12 absolute bottom-8">
              WHY PARTNER
              <br />
              WITH US
            </h2>
          </div>
        </div>

        <div className="relative z-10 px-8 md:px-16 max-w-[1440px] mx-auto">
          <p className="font-light font-sans text-base leading-7 text-black max-w-[725px] py-8 mb-20">
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
      <section className="py-12 md:py-32 px-8 md:px-16 max-w-[1440px] mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl uppercase leading-tight tracking-wide mb-6">
              Ready to Elevate
              <br />
              Your Corporate Travel?
            </h2>
            <p className="font-light text-base leading-7 text-gray-300 max-w-[500px] mb-10">
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

function ServiceCard( {
  iconSrc,
  title,
  description,
  className,
}: {
  iconSrc: string;
  title: string;
  description: string;
  className?: string;
} ) {
  return (
    <div className="bg-[#090909] p-8 pt-12">
      <div className="size-24">
        <div className={ cn( `mb-8 size-14 relative`, className ) }>
          <Image src={ iconSrc } alt="" fill className="object-contain" />
        </div>
      </div>
      <h3 className="font-wide text-xl tracking-widest text-white mb-3">
        { title }
      </h3>
      <p className="font-light text-base leading-6 text-white">{ description }</p>
    </div>
  );
}

function StandardItem( {
  title,
  description,
  src,
  className,
}: {
  title: string;
  description: string;
  src: string;
  className?: string;
} ) {
  return (
    <div className="flex flex-col items-start">
      <div className="mb-6 text-gold size-20 flex items-end">
        <Image src={ src } alt="" width={ 48 } height={ 48 } className={ cn( `size-14`, className ) } />
      </div>
      <h4 className="text-gold font-medium text-xl mb-3">{ title }</h4>
      <p className="text-black text-base font-light leading-6">{ description }</p>
    </div>
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
