"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { BookingOverlay } from "@/components/booking/BookingOverlay";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  FileText,
  CalendarDays,
  Briefcase,
  BadgeCheck
} from "lucide-react";

export default function BusinessPage() {
  const [ isBookingOpen, setIsBookingOpen ] = useState( false );

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header onBookNow={ () => setIsBookingOpen( true ) } />

      {/* Hero Section */ }
      <section className="relative h-[60vh] md:h-[70vh] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/1e141ce887d3a30045b7dceb10747c1658343708.png" // Using a sleek car image for business context
            alt="Corporate Transportation"
            fill
            className="object-cover opacity-50"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8">
          <div className="max-w-2xl">
            <h1 className="font-serif text-5xl md:text-7xl mb-6 tracking-wide leading-tight">
              HOUSTON&apos;S <br />PREMIER <br />CORPORATE TRAVEL
            </h1>
            <p className="font-sans text-gray-200 text-lg md:text-xl font-light tracking-wide mb-8">
              Efficiency, reliability, and precision for your business needs.
              Manage your Houston corporate transportation with a partner you can trust.
            </p>
            <div className="flex gap-4">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-black font-bold px-8 py-6 text-lg tracking-wider"
                >
                  OPEN CORPORATE ACCOUNT
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */ }
      <section className="py-20 md:py-32 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <BenefitCard
              icon={ <BadgeCheck className="w-12 h-12 text-gold" /> }
              title="Duty of Care"
              description="Safety is non-negotiable. Our rigorous vetting process and insurance standards provide total peace of mind for your team."
            />
            <BenefitCard
              icon={ <MapPin className="w-12 h-12 text-gold" /> }
              title="Local Mastery"
              description="Deep knowledge of Houston's traffic patterns, airports, and business districts ensures punctual and efficient travel within the city and surrounding areas."
            />
            <BenefitCard
              icon={ <FileText className="w-12 h-12 text-gold" /> }
              title="Streamlined Billing"
              description="Centralized management, detailed reporting, and flexible billing options designed to integrate with your expense platforms."
            />
          </div>
        </div>
      </section>

      {/* Corporate Solutions */ }
      <section className="py-20 md:py-32 px-8 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 space-y-8">
            <div>
              <h2 className="font-serif text-3xl md:text-5xl uppercase mb-6">Tailored Solutions</h2>
              <div className="w-16 h-1 bg-gold mb-6" />
              <p className="text-gray-300 font-light leading-relaxed text-lg">
                From daily commutes to roadshows, we adapt to your business schedule.
              </p>
            </div>

            <div className="grid gap-6">
              <SolutionItem
                icon={ <Briefcase className="w-6 h-6 text-gold" /> }
                title="Executive Transfers"
                description="Punctual, discreet service for C-suite executives and VIP clients."
              />
              <SolutionItem
                icon={ <CalendarDays className="w-6 h-6 text-gold" /> }
                title="Meetings & Events"
                description="Comprehensive logistics support for roadshows, conferences, and company events."
              />
              <SolutionItem
                icon={ <Building2 className="w-6 h-6 text-gold" /> }
                title="Employee Commutes"
                description="Safe, reliable shuttle services to keep your workforce moving efficiently between Sugar Land, The Woodlands, and Downtown."
              />
            </div>

            <Link href="/contact" className="inline-block pt-4">
              <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-black">
                INQUIRE ABOUT SOLUTIONS
              </Button>
            </Link>
          </div>
          <div className="order-1 md:order-2 relative h-[600px] w-full rounded-lg overflow-hidden border border-white/10">
            <Image
              src="/assets/images/143afa3113977d626f0cf3527546c88feec3a2c0.svg" // Abstract or tech-looking svg for "solutions" feeling
              alt="Corporate Solutions"
              fill
              className="object-cover p-20 opacity-80"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-80" />
          </div>
        </div>
      </section>

      {/* CTA */ }
      <section className="py-20 bg-gold/10 border-y border-gold/20">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-6">READY TO ELEVATE YOUR CORPORATE TRAVEL?</h2>
          <p className="text-gray-300 mb-8 font-light">
            Contact our specialized corporate team to discuss your specific requirements and set up your account.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-gold hover:bg-gold/90 text-black font-bold min-w-[200px]"
              >
                CONTACT SALES
              </Button>
            </Link>
            <Button
              onClick={ () => setIsBookingOpen( true ) }
              size="lg"
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white hover:text-black min-w-[200px]"
            >
              BOOK A RIDE NOW
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <BookingOverlay isOpen={ isBookingOpen } onClose={ () => setIsBookingOpen( false ) } />
    </main>
  );
}

function BenefitCard( { icon, title, description }: { icon: React.ReactNode, title: string, description: string; } ) {
  return (
    <div className="flex flex-col items-start">
      <div className="mb-6 p-4 bg-white/5 rounded-full border border-white/10">
        { icon }
      </div>
      <h3 className="text-2xl font-serif text-white mb-4">{ title }</h3>
      <p className="text-gray-400 font-light leading-relaxed">
        { description }
      </p>
    </div>
  );
}

function SolutionItem( { icon, title, description }: { icon: React.ReactNode, title: string, description: string; } ) {
  return (
    <div className="flex gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
      <div className="mt-1 shrink-0 bg-black p-2 rounded-lg h-fit border border-white/10">{ icon }</div>
      <div>
        <h4 className="text-white font-medium mb-1 text-lg">{ title }</h4>
        <p className="text-gray-400 text-sm font-light">{ description }</p>
      </div>
    </div>
  );
}
