"use client";

import { useState } from "react";
import Image from "next/image";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { BookingOverlay } from "@/components/booking/BookingOverlay";
import {
  ShieldCheck,
  UserCheck,
  Armchair,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Suburban } from "@/components/home/Suburban";
import { Button } from "@/components/ui/button";

export default function RidePage() {
  const [ isBookingOpen, setIsBookingOpen ] = useState( false );

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header onBookNow={ () => setIsBookingOpen( true ) } />

      {/* Hero Section */ }
      <section className="relative h-screen w-full flex justify-center overflow-hidden -mt-40">
        <div className="absolute inset-0">
          <Image
            src="/images/ce01f6e595c1c6b99ab43fd61cf48705c434161f.png"
            alt="Luxury Chauffeur Service"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-linear-to-t from-black/50 to-transparent" />
        </div>

        <div className="relative z-10 text-center px-4 mx-auto mt-50">
          <div className="flex flex-col items-between h-full relative">
            <h1 className="font-serif text-4xl font-medium tracking-wide text-white md:text-5xl">
              your personal
              <br />
              chauffeur
            </h1>
            <p className="font-light text-base leading-7 mt-4 mb-12 max-w-[600px] mx-auto">
              Experience the pinnacle of chauffeured services. Where every journey
              is crafted with precision, comfort, and elegance.
            </p></div>
          <Button
            onClick={ () => setIsBookingOpen( true ) }
            size={ 'lg' }
            variant={ 'outline' }
            className="bg-black/20 px-6 py-2 font-wide text-sm tracking-[0.2em] transition-colors absolute bottom-20 left-1/2 -translate-x-1/2 min-w-[280px]"
          >
            BOOK YOUR RIDE
          </Button>
        </div>
      </section>

      {/* Our Services */ }
      <section className="py-20 md:py-24 px-8 md:px-16 max-w-[1440px] mx-auto w-full">
        <h2 className="font-serif text-4xl md:text-[38px] uppercase leading-[52px] mb-8 md:mb-16">
          OUR SERVICES
        </h2>
        <p className="font-light text-base leading-7 max-w-[725px] mb-16">
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
            src="/images/0324a046a4585009531aef744e67eaf78bc1915c.png"
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black/50 to-transparent" >
            <h2 className="font-serif text-4xl md:text-5xl uppercase text-white px-8 md:px-12 absolute bottom-8">
              UNCOMPROMISING
              <br />
              STANDARDS
            </h2>
          </div>
        </div>

        <div className="relative z-10 px-8 md:px-16 max-w-[1440px] mx-auto">
          <p className="font-light text-base leading-7 text-black max-w-[725px] py-8 mb-20">
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
      <BookingOverlay
        isOpen={ isBookingOpen }
        onClose={ () => setIsBookingOpen( false ) }
      />
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

function AmenityItem( {
  iconSrc,
  label,
  showDivider = false,
}: {
  iconSrc: string;
  label: React.ReactNode;
  showDivider?: boolean;
} ) {
  return (
    <div
      className={ `flex-1 flex flex-col items-start gap-4 ${ showDivider ? "md:border-r md:border-white/20 md:pr-12 md:mr-12" : "" }` }
    >
      <div className="size-30 relative">
        <Image src={ iconSrc } alt="" fill className="object-contain" />
      </div>
      <p className="font-light text-sm leading-[22px] text-white">{ label }</p>
    </div>
  );
}

function StandardItem( {
  title,
  description,
  src,
  className
}: {
  title: string;
  description: string;
  src: string;
  className?: string;
} ) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex mb-6 text-gold size-20 items-end">
        <Image src={ src } alt="" width={ 48 } height={ 48 } className={ cn( `size-14`, className ) } />
      </div>
      <h4 className="text-gold font-medium text-xl mb-3">{ title }</h4>
      <p className="text-black text-base font-light leading-6">{ description }</p>
    </div>
  );
}

