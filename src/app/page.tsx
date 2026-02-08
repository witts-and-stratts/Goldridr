
"use client";

import { useState } from "react";
import { Hero } from "@/components/home/Hero";
import { InfoSection } from "@/components/home/InfoSection";
import { Suburban } from "@/components/home/Suburban";
import { Testimonials } from "@/components/home/Testimonials";
import { Footer } from "@/components/home/Footer";
import { BookingOverlay } from "@/components/booking/BookingOverlay";

export default function Home() {
  const [ isBookingOpen, setIsBookingOpen ] = useState( false );

  return (
    <main className="flex min-h-screen flex-col bg-black">
      <Hero onBookNow={ () => setIsBookingOpen( true ) } />
      <InfoSection />
      <Suburban />
      <Testimonials />
      <Footer />
      <BookingOverlay isOpen={ isBookingOpen } onClose={ () => setIsBookingOpen( false ) } />
    </main>
  );
}
