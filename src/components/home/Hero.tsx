"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import { useBookingOverlay } from "../booking/BookingContext";
import { Button } from "../ui/button";
import { Header } from "./Header";

const HERO_BG = "/assets/images/homepage-hero-chauffeur.webp";

const HERO_SLIDES = [
  {
    id: 1,
    image: HERO_BG,
    title: "YOUR PERSONAL CHAFFEUR",
    description: "Private transportation coordinated, professionally handled every time.",
    cta: "ESTIMATE YOUR RIDE",
  },
  {
    id: 2,
    image: HERO_BG,
    title: "Houston & Beyond",
    description: "Airport runs, city rides, and long-distance travel—structured for the way Houston moves",
    cta: "RIDE CALCULATOR",
  },
  {
    id: 3,
    image: HERO_BG,
    title: "ARRIVE BETTER",
    description: "Experience premium chauffeured services, in Houston and beyond",
    cta: "CHECK AVAILABILITY",
  }
]

export function Hero() {
  const sliderRef = useRef<HTMLDivElement>( null );
  const { setIsOpen } = useBookingOverlay();

  useEffect( () => {
    if ( !sliderRef.current ) return;

    const slider = new Splide( sliderRef.current, {
      type: "loop",
      autoplay: true,
      interval: 6000,
      speed: 1000,
      pauseOnHover: false,
      arrows: false,
      pagination: false,
    } );

    slider.mount();

    return () => {
      slider.destroy();
    };
  }, [] );

  return (
    <section className="relative isolate h-screen w-full overflow-hidden bg-black text-white select-none">
      <div className="absolute inset-x-0 top-0 z-50">
        <Header />
      </div>

      <div
        ref={ sliderRef }
        aria-label="Goldridr highlights"
        className="splide absolute inset-0 z-0 h-full"
      >
        <div className="splide__track h-full">
          <ul className="splide__list h-full">
            { HERO_SLIDES.map( ( slide, index ) => (
              <li key={ slide.id } className="splide__slide relative h-full">
                <div className="absolute inset-0 z-0">
                  <Image
                    src={ slide.image }
                    alt="Luxury Chauffeured Services"
                    fill
                    className="object-cover object-bottom opacity-70 max-md:object-[70%_50%]"
                    priority={ index === 0 }
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent via-35% to-black/90" />
                </div>

                <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-3 pb-16 text-center md:pb-24">
                  <h1 className="site-heading site-heading--display text-white">
                    { slide.title }
                  </h1>
                  <p className="text-base mt-3 tracking-wide text-gray-200 text-balance md:mt-2">
                    { slide.description }
                  </p>
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-black/20"
                      onClick={ () => setIsOpen( true ) }
                    >
                      { slide.cta }
                    </Button>
                  </div>
                  <p className="mt-4 font-sans text-xs font-light tracking-wide text-gray-300 md:text-sm">
                    Clear pricing. Confirmed scheduling. Professional handling.
                  </p>
                </div>
              </li>
            ) ) }
          </ul>
        </div>
      </div>
    </section>
  );
}
