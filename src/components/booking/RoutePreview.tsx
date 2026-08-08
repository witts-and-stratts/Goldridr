"use client";

import { useMemo } from "react";
import { Loader2, Maximize2, Plane } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { InteractiveRouteMap } from "@/components/booking/InteractiveRouteMap";

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
      <span className="mt-1 block text-balance font-wide uppercase text-2xl leading-tight text-white xl:text-3xl">{ value }</span>
    </motion.div>
  );
}

export function RoutePreview( {
  pickupLocation,
  dropoffLocation,
  serviceType,
  distanceData,
  hourlyHours,
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

  return (
    <div className="relative isolate hidden min-h-[520px] overflow-hidden lg:flex lg:flex-col m-8 rounded-lg">
      <AnimatePresence>
        { flightDetails && <FlightCard flight={ flightDetails } terminal={ terminal } /> }
      </AnimatePresence>

      <InteractiveRouteMap
        pickupLocation={ pickupLocation }
        dropoffLocation={ isHourly ? undefined : dropoffLocation }
        className="absolute inset-0"
      />

      <button
        type="button"
        onClick={ onShowMap }
        className="absolute bottom-36 right-6 z-20 flex items-center gap-2 border border-white/15 bg-black/80 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Open expanded route map"
      >
        <Maximize2 className="size-3.5" />
        Expand
      </button>

      <div className="pointer-events-none relative mt-auto bg-linear-to-t from-black via-black/80 to-transparent px-8 pb-8 pt-16">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
          <span className="truncate">
            { hasRoute ? "" : "Awaiting addresses" }
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
