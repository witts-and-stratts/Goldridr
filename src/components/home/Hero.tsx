"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import { Header } from "./Header";

const HERO_BG = "/assets/images/arrive-better-goldridr.jpg";

const HERO_SLIDES = [
  {
    id: 1,
    image: HERO_BG,
    title: "YOUR PERSONAL CHAFFEUR",
    description: "Private transportation coordinated, professionally handled every time.",
  },
  {
    id: 2,
    image: HERO_BG,
    title: "Houston & Beyond",
    description: "Airport runs, city rides, and long-distance travel—structured for the way Houston moves",
  },
  {
    id: 3,
    image: HERO_BG,
    title: "ARRIVE BETTER",
    description: "Experience premium chauffeured services, in Houston and beyond",
  }
]

export function Hero() {
  const sliderRef = useRef<HTMLDivElement>( null );

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
    <section className="isolate relative h-screen w-full overflow-hidden bg-black text-white select-none">
      {/* Navigation */ }
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
              <li key={ slide.id } className="splide__slide relative h-screen">
                {/* Background Image */ }
                <div className="absolute inset-0 z-0">
                  <Image
                    src={ slide.image }
                    alt="Luxury Chauffeured Services"
                    fill
                    className="object-cover opacity-70 max-md:object-[70%_50%]"
                    priority={ index === 0 }
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80" />
                </div>

                {/* Main Content */ }
                <div className="relative z-10 flex w-full flex-col items-center justify-center px-3 pt-[calc(3rem+10%)] pb-[10%] text-center md:pt-[calc(6.5rem+5%)] md:pb-[5%]">
                  <h1 className="font-serif text-3xl font-medium tracking-wide text-white md:text-4xl lg:text-5xl">
                    { slide.title }
                  </h1>
                  <p className="mt-3 max-w-2xl font-sans text-sm font-light tracking-wide text-gray-200 md:mt-4 md:text-base text-balance">
                    { slide.description }
                  </p>
                </div>
              </li>
            ) ) }
          </ul>
        </div>
      </div>

      {/* Bottom Bar / Features */ }
      <div className="absolute bottom-16 left-0 right-0 z-20 flex w-full flex-col items-center justify-center md:px-8">
        <h2 className="md:mb-6 mx-auto font-serif text-lg md:text-xl font-bold text-center text-white uppercase">BOOK A RIDE</h2>
        <div className="flex w-full max-w-4xl justify-between md:pt-2">
          <FeatureItem
            icon={ <Image src="/assets/images/icon/airplane.svg" className="h-10 md:h-20 w-auto" alt="Airport" width={ 80 } height={ 80 } /> }
            title="Airport Rides"
            description="Advanced reservations to and from all airports in Houston"
          />
          <FeatureItem
            icon={ <Image src="/assets/images/icon/city.svg" className="h-8 md:h-16 w-auto" alt="City" width={ 80 } height={ 80 } /> }
            title="Around Town"
            description="Upfront pricing for trips around Houston"
          />
          <FeatureItem
            icon={ <Image src="/assets/images/icon/clock.svg" className="h-8 md:h-16 w-auto" alt="Hourly" width={ 80 } height={ 80 } /> }
            title="Hourly"
            description="Available whenever and whenever you need us"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureItem( { icon, title, description }: { icon: React.ReactNode, title: string, description: string; } ) {
  return (
    <div className="flex flex-1 flex-col items-center text-center px-2 md:px-10 border-r border-white/20 last-of-type:border-r-0">
      <div className="md:mb-3 size-14 md:size-20 flex items-center justify-center">{ icon }</div>
      <h3 className="mb-1 font-sans font-medium text-white max-md:text-sm">{ title }</h3>
      <p className="text-white font-sans text-[9px] md:text-sm text-balance font-light">{ description }</p>
    </div>
  );
}
