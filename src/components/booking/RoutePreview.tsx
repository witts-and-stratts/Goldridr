"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Plane } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";

interface FlightDetails {
  airline: string;
  departure: string;
  arrival: string;
  status: string;
  flightNumber: string;
  terminal: string;
  departureTerminal: string;
  gate: string;
  origin: string;
  destination: string;
}

interface RoutePreviewProps {
  pickupLocation: string;
  dropoffLocation: string;
  serviceType: "airport" | "city" | "hourly";
  distanceData?: {
    total_miles: number;
    duration_text: string;
    duration_minutes: number;
    total_price: number;
  } | null;
  hourlyHours?: number | null;
  mapPreviewUrl?: string | null;
  flightDetails?: FlightDetails | null;
  terminal?: string;
  isLoading?: boolean;
  onShowMap?: () => void;
}

// The flight API returns "-" when a terminal is not published yet; appending that to
// an airport code reads as a broken value ("OMA T-") rather than an absent one.
function terminalLabel( terminal: string ): string {
  return terminal && terminal !== "-" ? ` T${ terminal }` : "";
}

const EASE = [ 0.16, 1, 0.3, 1 ] as const;

// The card is choreographed rather than fading as one block: the shell arrives first,
// then the two times converge on the route line, which draws outward from the centre
// before the detail row counts in. Leaving runs the same sequence backwards and
// faster, so the card feels like it retracts rather than blinking out.
function buildVariants( reduced: boolean ) {
  if ( reduced ) {
    const fade: Variants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.15 } },
    };
    return { card: fade, group: fade, rise: fade, fromLeft: fade, fromRight: fade, line: fade, plane: fade };
  }

  return {
    card: {
      hidden: { opacity: 0, y: -20, scale: 0.97 },
      visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.45, ease: EASE, when: "beforeChildren", delayChildren: 0.1, staggerChildren: 0.08 },
      },
      exit: {
        opacity: 0, y: -14, scale: 0.97,
        transition: { duration: 0.28, ease: "easeIn", when: "afterChildren", staggerChildren: 0.04, staggerDirection: -1 },
      },
    },
    group: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.07 } },
      exit: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
    },
    rise: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
      exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: "easeIn" } },
    },
    fromLeft: {
      hidden: { opacity: 0, x: -16 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
      exit: { opacity: 0, x: -12, transition: { duration: 0.18, ease: "easeIn" } },
    },
    fromRight: {
      hidden: { opacity: 0, x: 16 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
      exit: { opacity: 0, x: 12, transition: { duration: 0.18, ease: "easeIn" } },
    },
    line: {
      hidden: { scaleX: 0, opacity: 0 },
      visible: { scaleX: 1, opacity: 1, transition: { duration: 0.5, ease: EASE } },
      exit: { scaleX: 0, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
    },
    plane: {
      hidden: { opacity: 0, x: -14 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE, delay: 0.12 } },
      exit: { opacity: 0, x: 10, transition: { duration: 0.15 } },
    },
  } satisfies Record<string, Variants>;
}

// Sits over the map rather than in the form column: it is retrieved information about
// the trip, not something the guest fills in.
function FlightCard( { flight, terminal }: { flight: FlightDetails; terminal?: string; } ) {
  const reduced = useReducedMotion();
  const v = useMemo( () => buildVariants( !!reduced ), [ reduced ] );

  const stats = [
    { label: "Terminal", value: terminal?.trim() || flight.terminal },
    { label: "Status", value: flight.status },
    { label: "Gate", value: flight.gate },
    { label: "Airline", value: flight.airline },
  ];

  return (
    <motion.div
      variants={ v.card }
      initial="hidden"
      animate="visible"
      exit="exit"
      className="pointer-events-none absolute inset-x-6 top-6 z-10 border border-dashed border-white/15 bg-black/80 text-sm text-white shadow-2xl backdrop-blur-md"
    >
      <motion.div variants={ v.group } className="p-5">
        <motion.div
          variants={ v.rise }
          className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-white/40"
        >
          <span>From</span>
          <span>To</span>
        </motion.div>

        <motion.div variants={ v.group } className="flex items-center">
          <motion.span variants={ v.fromLeft } className="font-wide text-3xl text-white">
            { flight.departure }
          </motion.span>
          <div className="flex flex-1 items-center justify-center px-4">
            <motion.div variants={ v.line } className="relative h-px w-full bg-white/20">
              <motion.span
                variants={ v.plane }
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <Plane className="size-4 rotate-90 text-gold" />
              </motion.span>
            </motion.div>
          </div>
          <motion.span variants={ v.fromRight } className="font-wide text-3xl text-white">
            { flight.arrival }
          </motion.span>
        </motion.div>

        <motion.div
          variants={ v.rise }
          className="flex justify-between text-xs uppercase tracking-[0.15em] text-white/50"
        >
          <span>{ flight.origin }{ terminalLabel( flight.departureTerminal ) }</span>
          <span>{ flight.destination }{ terminalLabel( flight.terminal ) }</span>
        </motion.div>
      </motion.div>

      <motion.div variants={ v.line } className="mx-5 origin-left border-t border-dashed border-white/15" />

      {/* Terminal, status and gate are short; the airline name takes what is left
          so it is not needlessly truncated. */ }
      <motion.div
        variants={ v.group }
        className="flex justify-between gap-4 p-5"
      >
        { stats.map( ( stat ) => (
          <motion.div key={ stat.label } variants={ v.rise } className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">{ stat.label }</span>
            <span className="block truncate text-base">{ stat.value }</span>
          </motion.div>
        ) ) }
      </motion.div>
    </motion.div>
  );
}

function Stat( { label, value, delay }: { label: string; value: string; delay: number; } ) {
  return (
    <motion.div
      className="min-w-0"
      initial={ { opacity: 0, y: 8 } }
      animate={ { opacity: 1, y: 0 } }
      exit={ { opacity: 0, y: 8 } }
      transition={ { duration: 0.35, delay, ease: "easeOut" } }
    >
      <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">{ label }</span>
      <span className="mt-1 block text-balance font-serif text-lg leading-tight text-white xl:text-xl">{ value }</span>
    </motion.div>
  );
}

// The route drawing is deliberately schematic — it reads as a route the moment the
// panel appears, and is swapped for the real static map as soon as one is available.
function SchematicRoute( { hasPickup, hasDropoff, showGrid }: { hasPickup: boolean; hasDropoff: boolean; showGrid: boolean; } ) {
  return (
    <svg
      viewBox="0 0 400 420"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <pattern id="route-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        </pattern>
      </defs>
      { showGrid && (
        <>
          <rect width="400" height="420" fill="url(#route-grid)" />
          <path d="M0 210 L400 130" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
          <path d="M0 300 L400 250" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
        </>
      ) }

      <motion.path
        d="M60 70 C 160 130, 130 250, 250 300 S 320 330, 330 360"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={ { pathLength: 0, opacity: 0 } }
        animate={ { pathLength: 1, opacity: 1 } }
        transition={ { duration: 1.1, ease: "easeInOut" } }
      />

      <circle
        cx="60" cy="70" r="6"
        fill={ hasPickup ? "#D4AF37" : "transparent" }
        stroke="#D4AF37"
        strokeWidth="2"
      />
      <circle
        cx="330" cy="360" r="6"
        fill={ hasDropoff ? "#D4AF37" : "transparent" }
        stroke="#D4AF37"
        strokeWidth="2"
      />
    </svg>
  );
}

export function RoutePreview( {
  pickupLocation,
  dropoffLocation,
  serviceType,
  distanceData,
  hourlyHours,
  mapPreviewUrl,
  flightDetails,
  terminal,
  isLoading,
  onShowMap,
}: RoutePreviewProps ) {
  const isHourly = serviceType === "hourly";
  const hasPickup = pickupLocation.trim().length > 0;
  const hasDropoff = dropoffLocation.trim().length > 0;

  const distanceValue = distanceData ? `${ Math.round( distanceData.total_miles ) } mi` : "— mi";
  const durationValue = isHourly
    ? ( hourlyHours ? `${ hourlyHours } hr` : "— hr" )
    : ( distanceData?.duration_text ?? "— min" );

  // An hourly charter has no drop-off, so its route is complete with a pickup alone.
  const hasRoute = hasPickup && ( isHourly || hasDropoff );

  const [ houstonMapUrl, setHoustonMapUrl ] = useState<string | null>( null );

  useEffect( () => {
    let cancelled = false;

    fetch( "/api/route-map?size=640x800" )
      .then( response => response.json() )
      .then( data => {
        if ( !cancelled && data.success ) setHoustonMapUrl( data.staticMapUrl );
      } )
      .catch( () => { /* the schematic route stands in if the map cannot be fetched */ } );

    return () => { cancelled = true; };
  }, [] );

  return (
    <div className="relative isolate hidden min-h-[520px] overflow-hidden border-l border-white/10 bg-[#0a0a0a] lg:flex lg:flex-col">
      <AnimatePresence>
        { flightDetails && <FlightCard flight={ flightDetails } terminal={ terminal } /> }
      </AnimatePresence>

      { mapPreviewUrl ? (
        <button
          type="button"
          onClick={ onShowMap }
          className="absolute inset-0 cursor-zoom-in"
          aria-label="Enlarge route map"
        >
          <Image
            src={ mapPreviewUrl }
            alt="Route preview"
            fill
            unoptimized
            className="object-cover"
          />
        </button>
      ) : houstonMapUrl ? (
        // Nothing chosen yet: greater Houston as an ambient backdrop. No route line or
        // endpoint labels here — they would describe a trip that does not exist yet.
        <motion.div
          className="absolute inset-0"
          initial={ { opacity: 0 } }
          animate={ { opacity: 1 } }
          transition={ { duration: 0.8, ease: "easeOut" } }
        >
          <Image
            src={ houstonMapUrl }
            alt="Greater Houston"
            fill
            unoptimized
            className="object-cover"
          />
          <span className="absolute left-8 top-8 text-[10px] uppercase tracking-[0.25em] text-white/50">
            Houston · Texas
          </span>
        </motion.div>
      ) : (
        <>
          <SchematicRoute hasPickup={ hasPickup } hasDropoff={ hasDropoff } showGrid />
          <span className="pointer-events-none absolute left-[17%] top-[13%] -translate-y-full pb-3 text-[10px] uppercase tracking-[0.25em] text-white/50">
            Pickup
          </span>
          <span className="pointer-events-none absolute left-[70%] top-[87%] pt-3 text-[10px] uppercase tracking-[0.25em] text-white/50">
            { isHourly ? "As directed" : "Drop-off" }
          </span>
        </>
      ) }

      <div className="pointer-events-none relative mt-auto bg-gradient-to-t from-black via-black/80 to-transparent px-8 pb-8 pt-16">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
          <span className="truncate">
            { hasRoute ? "Route preview" : "Route preview — awaiting addresses" }
          </span>
          <AnimatePresence>
            { isLoading && (
              <motion.span initial={ { opacity: 0 } } animate={ { opacity: 1 } } exit={ { opacity: 0 } }>
                <Loader2 className="size-3 animate-spin text-gold" />
              </motion.span>
            ) }
          </AnimatePresence>
        </div>

        {/* The figures stay out of the way until there is actually a route to describe,
            then stagger in rather than popping from em dashes to numbers. */ }
        <AnimatePresence>
          { hasRoute && (
            <motion.div
              className="grid grid-cols-2 gap-4 overflow-hidden"
              initial={ { height: 0, marginTop: 0 } }
              animate={ { height: "auto", marginTop: 20 } }
              exit={ { height: 0, marginTop: 0 } }
              transition={ { duration: 0.4, ease: "easeOut" } }
            >
              <Stat
                label="Distance"
                value={ isHourly ? "As directed" : distanceValue }
                delay={ 0.1 }
              />
              <Stat
                label={ isHourly ? "Booked for" : "Drive time" }
                value={ durationValue }
                delay={ 0.18 }
              />
            </motion.div>
          ) }
        </AnimatePresence>
      </div>
    </div>
  );
}
