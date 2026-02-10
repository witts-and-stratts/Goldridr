import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/button";
import { AirportsOverlay } from "./AirportsOverlay";

export function InfoSection() {
  const [ isAirportOverlayOpen, setIsAirportOverlayOpen ] = useState( false );

  return (
    <section className="bg-black px-4 py-24 text-white md:px-16 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-6 font-serif text-4xl uppercase leading-tight tracking-wide">
          Available Everywhere
          <br />
          and Anytime in Houston
        </h2>
        <p className="mb-12 max-w-2xl text-sm font-light leading-relaxed text-gray-300 md:text-base">
          From promises of long-distance travel arrivals or departures, we use smart
          technology to make your experience seamless—we’re used to our service
          profiles and serious stiffness, creative aims, simulation, and even
          without ice to fix sides.
        </p>
        <Button
          onClick={ () => setIsAirportOverlayOpen( true ) }
          size={ 'lg' }
          variant='outline'
        >
          SEE ALL AIRPORT LOCATIONS
        </Button>
      </div>
      <AirportsOverlay
        isOpen={ isAirportOverlayOpen }
        onClose={ () => setIsAirportOverlayOpen( false ) }
      />
    </section>
  );
}
