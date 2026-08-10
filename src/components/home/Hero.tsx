"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import { useBookingOverlay } from "../booking/BookingContext";
import { Button } from "../ui/button";
import { Header } from "./Header";
import styles from "./Hero.module.css";

const HERO_BG = "/assets/images/goldridr-chauffeur-and-client.jpg";
const HERO_HOUSTON = "/assets/images/houston-skyline.jpg";
const HERO_CLIENT= "/assets/images/gold-ridr-chauffeur-with-client.jpg";

export type HeroSlide = {
  id: number;
  image: string;
  title: string;
  description: string;
  cta: string;
  alt?: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: HERO_BG,
    title: "YOUR PERSONAL CHAFFEUR",
    description: "Private transportation coordinated, professionally handled every time.",
    cta: "ESTIMATE YOUR RIDE",
  },
  {
    id: 2,
    image: HERO_HOUSTON,
    title: "Houston & Beyond",
    description: "Airport runs, city rides, and long-distance travel—structured for the way Houston moves",
    cta: "RIDE CALCULATOR",
  },
  {
    id: 3,
    image: HERO_CLIENT,
    title: "ARRIVE BETTER",
    description: "Experience premium chauffeured services, in Houston and beyond",
    cta: "CHECK AVAILABILITY",
  }
];

type HeroProps = {
  slides?: HeroSlide[];
  ariaLabel?: string;
};

export function Hero( { slides = HERO_SLIDES, ariaLabel = "GoldRidrhighlights" }: HeroProps ) {
  const sliderRef = useRef<HTMLDivElement>( null );
  const { setIsOpen } = useBookingOverlay();

  useEffect( () => {
    if ( !sliderRef.current ) return;

    const prefersReducedMotion = window.matchMedia( "(prefers-reduced-motion: reduce)" ).matches;
    const slider = new Splide( sliderRef.current, {
      type: "fade",
      rewind: true,
      autoplay: !prefersReducedMotion && slides.length > 1,
      interval: 6000,
      speed: 3000,
      pauseOnHover: false,
      arrows: false,
      pagination: false,
    } );

    slider.mount();

    return () => {
      slider.destroy();
    };
  }, [ slides.length ] );

  return (
    <section className="relative isolate h-screen w-full overflow-hidden bg-black text-white select-none">
      <div className="absolute inset-x-0 top-0 z-50">
        <Header />
      </div>

      <div
        ref={ sliderRef }
        aria-label={ ariaLabel }
        className={ `splide absolute inset-0 z-0 h-full ${ styles.slider }` }
      >
        <div className="splide__track h-full w-full">
          <ul className="splide__list h-full w-full">
            { slides.map( ( slide, index ) => (
              <li key={ slide.id } className="splide__slide relative h-full w-full min-w-full shrink-0">
                <div className="absolute inset-0 z-0">
                  <Image
                    src={ slide.image }
                    alt={ slide.alt ?? "Luxury Chauffeured Services" }
                    fill
                    quality={100}
                    className={ `object-cover object-bottom opacity-70 max-md:object-[70%_50%] ${ styles.heroImage }` }
                    priority={ index === 0 }
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent via-35% to-black/90" />
                </div>

                <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-3 pb-16 text-center md:pb-24">
                  <h1 className={ `site-heading site-heading mb-1 text-white ${ styles.headline }` }>
                    { slide.title }
                  </h1>
                  <p className={ `text-base mt-3 tracking-wide text-gray-200 text-balance md:mt-2 max-w-200 ${ styles.description }` }>
                    { slide.description }
                  </p>
                  <div className={ `mt-6 ${ styles.cta }` }>
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-black/20"
                      onClick={ () => setIsOpen( true ) }
                    >
                      { slide.cta }
                    </Button>
                  </div>
                  <p className={ `mt-4 font-sans text-xs font-light tracking-wide text-gray-300 md:text-sm ${ styles.assurance }` }>
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
