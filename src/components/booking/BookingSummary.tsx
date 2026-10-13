"use client";

import { Loader2, Plane } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface BookingSummaryData {
  date?: Date | string;
  time?: string;
  passengers?: string | number;
  flightNumber?: string;
  terminal?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  roundTrip?: boolean;
  returnDate?: Date | string;
  returnTime?: string;
  returnFlightNumber?: string;
}

interface BookingSummaryProps {
  bookingType: "airport" | "town" | "hourly";
  bookingData: BookingSummaryData;
  distanceData?: {
    total_miles: number;
    duration_text: string;
    total_price: number;
    price_per_mile: number;
    round_trip_discount_percent?: number;
  } | null;
  hourlyData?: {
    hours: number;
    rate: number;
    totalPrice: number;
  };
  flightDetails?: {
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
    originAirport: string;
    destinationAirport: string;
    flightDate: string;
  } | null;
  isDistanceLoading?: boolean;
}

const formatShortDate = ( value?: Date | string ) =>
  value ? new Date( value ).toLocaleDateString( undefined, { day: 'numeric', month: 'short' } ) : '-';

interface LegCardProps {
  label: string;
  date?: Date | string;
  time?: string;
  flightNumber?: string;
  terminal?: string;
  pickup?: string;
  dropoff?: string;
  price?: number;
}

function LegCard( { label, date, time, flightNumber, terminal, pickup, dropoff, price }: LegCardProps ) {
  return (
    <section aria-label={ `${ label } leg` } className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{ label }</span>
        { price !== undefined && <span className="font-wide text-sm text-gray-300">${ price.toFixed( 2 ) }</span> }
      </div>
      <div className="flex justify-between">
        <div>
          <span className="block text-xs text-gray-500">Date</span>
          <span className="font-bold font-wide text-2xl">{ formatShortDate( date ) }</span>
        </div>
        <div className="text-right">
          <span className="block text-xs text-gray-500">Time</span>
          <span className="font-bold text-2xl font-wide">{ time || '-' }</span>
        </div>
      </div>
      { ( flightNumber || terminal ) && (
        <div className="flex justify-between">
          <div>
            <span className="block text-xs text-gray-500">Flight</span>
            <span className="font-bold text-lg font-wide">{ flightNumber || '-' }</span>
          </div>
          { terminal && (
            <div className="text-right">
              <span className="block text-xs text-gray-500">Terminal</span>
              <span className="font-bold text-lg font-wide">{ terminal }</span>
            </div>
          ) }
        </div>
      ) }
      <div className="space-y-1">
        <div>
          <span className="block text-xs text-gray-500">Pickup</span>
          <span className="font-normal text-white leading-tight">{ pickup || '-' }</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500">Dropoff</span>
          <span className="font-normal text-white leading-tight">{ dropoff || '-' }</span>
        </div>
      </div>
    </section>
  );
}

export function BookingSummary( {
  bookingType,
  bookingData,
  distanceData,
  hourlyData,
  flightDetails,
  isDistanceLoading,
}: BookingSummaryProps ) {
  const isRoundTrip = Boolean( bookingData.roundTrip ) && bookingType !== "hourly";
  const roundTripDiscountPercent = distanceData?.round_trip_discount_percent ?? 0;
  const roundTripFare = distanceData ? distanceData.total_price * 2 : 0;
  const roundTripDiscount = Math.round( roundTripFare * roundTripDiscountPercent ) / 100;

  return (
    <motion.div className="overflow-hidden rounded-md bg-black/60 text-white text-sm shadow-lg border border-border/20 m-4 mr-2 min-h-[calc(100%-2rem)]">
      {/* Flight Details Section (Airport Only) */ }
      { bookingType === "airport" && flightDetails && (
        <>
            <div className="p-5 pb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>From</span>
                <span>To</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-3xl font-bold font-wide text-white">{ flightDetails.departure }</span>
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="h-px w-full bg-gray-300 relative">
                    <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37] rotate-90" />
                  </div>
                </div>
                <span className="text-3xl font-bold font-wide text-white">{ flightDetails.arrival }</span>
              </div>
              <div className="flex justify-between text-lg text-gray-500 font-wide">
                <span>{ flightDetails.origin }</span>
                <span>{ flightDetails.destination }</span>
              </div>
            </div>
            <div className="border-t border-dashed border-gray-800 mx-5"></div>
        </>
      ) }

      { isRoundTrip ? (
        <div className="p-5 pt-4 space-y-4">
          <LegCard
            label="Outbound"
            date={ bookingData.date }
            time={ bookingData.time }
            flightNumber={ bookingType === "airport" ? flightDetails?.flightNumber || bookingData.flightNumber : undefined }
            terminal={ bookingType === "airport" ? bookingData.terminal : undefined }
            pickup={ bookingData.pickupLocation }
            dropoff={ bookingData.dropoffLocation }
            price={ distanceData?.total_price }
          />
          <div className="border-t border-dashed border-gray-800"></div>
          {/* The return leg runs the same route in reverse. */ }
          <LegCard
            label="Return"
            date={ bookingData.returnDate }
            time={ bookingData.returnTime }
            flightNumber={ bookingType === "airport" ? bookingData.returnFlightNumber : undefined }
            pickup={ bookingData.dropoffLocation }
            dropoff={ bookingData.pickupLocation }
            price={ distanceData?.total_price }
          />
          <div className="border-t border-dashed border-gray-800"></div>
          <div>
            <span className="block text-xs text-gray-500">Passengers</span>
            <span className="font-bold text-lg font-wide">{ bookingData.passengers }</span>
          </div>
        </div>
      ) : (
        <>
        {/* Common Trip Details */ }
        <div className="p-5 pt-4 space-y-4">
          <div className="flex justify-between">
            <div>
              <span className="block text-xs text-gray-500">Date</span>
              <span className="font-bold font-wide text-2xl">
                { bookingData.date ? new Date( bookingData.date ).toLocaleDateString( undefined, { day: 'numeric', month: 'short' } ) : '-' }
              </span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-gray-500">Time</span>
              <span className="font-bold text-2xl font-wide">{ bookingData.time || '-' }</span>
            </div>
          </div>

          { bookingType === "hourly" ? (
            <div className="flex justify-between">
              <div>
                <span className="block text-xs text-gray-500">Duration</span>
                <span className="font-bold text-2xl font-wide">{ hourlyData?.hours || 0 } Hours</span>
              </div>
              <div className="text-right">
                <span className="block text-xs text-gray-500">Rate</span>
                <span className="font-bold text-2xl font-wide">${ hourlyData?.rate || 0 }/hr</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between">
              <div>
                <span className="block text-xs text-gray-500">Passengers</span>
                <span className="font-bold text-lg font-wide">{ bookingData.passengers }</span>
              </div>
              { bookingType === "airport" && (
                <div className="text-right">
                  <span className="block text-xs text-gray-500">Flight</span>
                  <span className="font-bold text-lg font-wide">{ flightDetails?.flightNumber || bookingData.flightNumber }</span>
                </div>
              ) }
            </div>
          ) }
          { bookingType === "airport" && bookingData.terminal && (
            <div>
              <span className="block text-xs text-gray-500">Airport Terminal</span>
              <span className="font-bold text-lg font-wide">{ bookingData.terminal }</span>
            </div>
          ) }
        </div>

        <div className="border-t border-dashed border-gray-800 mx-5"></div>

        {/* Location Section */ }
        <div className="p-5 pt-4 space-y-3">
          <div className="flex flex-col gap-2">
            <div>
              <span className="block text-xs text-gray-500">Pickup Location</span>
              <span className="font-normal text-white text-lg leading-tight">{ bookingData.pickupLocation }</span>
            </div>
            { bookingType !== "hourly" && (
              <>
                <div className="border-t border-dashed border-gray-800 my-1"></div>
                <div>
                  <span className="block text-xs text-gray-500">Dropoff Location</span>
                  <span className="font-normal text-white text-lg leading-tight">{ bookingData.dropoffLocation }</span>
                </div>
              </>
            ) }
          </div>
        </div>
        </>
      ) }

      <div className="border-t border-dashed border-gray-800 mx-5"></div>

      {/* Pricing Section */ }
      <div className="p-5 pt-4 space-y-3">
        { bookingType === "hourly" && hourlyData ? (
          <div className="border-t border-gray-800 pt-3">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>{ hourlyData.hours } hours × ${ hourlyData.rate }/hr</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-3xl font-bold text-gold font-wide">${ hourlyData.totalPrice.toFixed( 2 ) }</span>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            { isDistanceLoading ? (
              <motion.div
                initial={ { opacity: 0, height: 0 } }
                animate={ { opacity: 1, height: "auto" } }
                exit={ { opacity: 0, height: 0 } }
                transition={ { duration: 0.5 } }
                className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
                <span className="ml-2 text-sm text-gray-500">Calculating distance...</span>
              </motion.div>
            ) : distanceData ? (
              <motion.div
                initial={ { opacity: 0, height: 0 } }
                animate={ { opacity: 1, height: "auto" } }
                exit={ { opacity: 0, height: 0 } }
                transition={ { duration: 0.3 } }
              >
                <div
                  className="flex justify-between">
                  <div>
                    <span className="block text-xs text-gray-500">{ isRoundTrip ? "Distance (each way)" : "Distance" }</span>
                    <span className="font-bold text-lg font-wide">{ distanceData.total_miles } mi</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-gray-500">{ isRoundTrip ? "Est. Duration (each way)" : "Est. Duration" }</span>
                    <span className="font-bold text-lg font-wide">{ distanceData.duration_text }</span>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3 mt-3">
                  { isRoundTrip ? (
                    <>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Outbound · { distanceData.total_miles } mi × ${ distanceData.price_per_mile.toFixed( 2 ) }/mi</span>
                        <span>${ distanceData.total_price.toFixed( 2 ) }</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Return · { distanceData.total_miles } mi × ${ distanceData.price_per_mile.toFixed( 2 ) }/mi</span>
                        <span>${ distanceData.total_price.toFixed( 2 ) }</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>{ distanceData.total_miles } miles × ${ distanceData.price_per_mile.toFixed( 2 ) }/mi</span>
                    </div>
                  ) }
                  { isRoundTrip && roundTripDiscount > 0 && (
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Round trip discount ({ roundTripDiscountPercent }%)</span>
                      <span>−${ roundTripDiscount.toFixed( 2 ) }</span>
                    </div>
                  ) }
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-500">{ isRoundTrip ? "Estimated Round Trip Total" : "Estimated Total" }</span>
                    <span className="text-3xl font-bold text-gold font-wide">${ ( isRoundTrip ? roundTripFare - roundTripDiscount : distanceData.total_price ).toFixed( 2 ) }</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-2">
                Unable to calculate distance
              </div>
            ) }
          </AnimatePresence>
        ) }
      </div>
    </motion.div>
  );
}
