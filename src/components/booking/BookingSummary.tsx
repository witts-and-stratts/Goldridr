"use client";

import { Loader2, MapPin, Plane } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface BookingSummaryProps {
  bookingType: "airport" | "town" | "hourly";
  bookingData: any;
  distanceData?: {
    total_miles: number;
    duration_text: string;
    total_price: number;
    price_per_mile: number;
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
  mapPreviewUrl?: string | null; // URL for the small preview image
  isDistanceLoading?: boolean;
  onShowMap: () => void;
}

export function BookingSummary( {
  bookingType,
  bookingData,
  distanceData,
  hourlyData,
  flightDetails,
  mapPreviewUrl,
  isDistanceLoading,
  onShowMap,
}: BookingSummaryProps ) {
  return (
    <motion.div className="overflow-hidden rounded-[10px] bg-black/60 text-white text-sm shadow-lg border border-border/20">
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

      {/* Common Trip Details */ }
      <div className="p-5 pt-4 space-y-4">
        <div className="flex justify-between">
          <div>
            <span className="block text-xs text-gray-500">Date</span>
            <span className="font-bold text-lg font-wide">
              { bookingData.date ? new Date( bookingData.date ).toLocaleDateString( undefined, { day: 'numeric', month: 'short' } ) : '-' }
            </span>
          </div>
          <div className="text-right">
            <span className="block text-xs text-gray-500">Time</span>
            <span className="font-bold text-lg font-wide">{ bookingData.time || '-' }</span>
          </div>
        </div>

        { bookingType === "hourly" ? (
          <div className="flex justify-between">
            <div>
              <span className="block text-xs text-gray-500">Duration</span>
              <span className="font-bold text-lg font-wide">{ hourlyData?.hours || 0 } Hours</span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-gray-500">Rate</span>
              <span className="font-bold text-lg font-wide">${ hourlyData?.rate || 0 }/hr</span>
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
      </div>

      <div className="border-t border-dashed border-gray-800 mx-5"></div>

      {/* Location Section */ }
      <div className="p-5 pt-4 space-y-3 flex justify-between gap-5">
        <div className="flex-1 flex flex-col gap-2">
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

        {/* Map Preview Button */ }
        <button
          type="button"
          onClick={ onShowMap }
          className={ `rounded-xl overflow-hidden border border-white/10 hover:border-gold transition-colors flex-shrink-0 ${ bookingType === "hourly" ? "w-24 h-20" : "w-1/3 min-w-[120px]" }` }
        >
          { mapPreviewUrl ? (
            <img
              src={ mapPreviewUrl }
              alt="Map preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-black/40 flex items-center justify-center">
              { isDistanceLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : (
                <MapPin className="h-5 w-5 text-gold" />
              ) }
            </div>
          ) }
        </button>
      </div>

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
              <span className="text-2xl font-bold text-gold font-wide">${ hourlyData.totalPrice.toFixed( 2 ) }</span>
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
                    <span className="block text-xs text-gray-500">Distance</span>
                    <span className="font-bold text-lg font-wide">{ distanceData.total_miles } mi</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-gray-500">Est. Duration</span>
                    <span className="font-bold text-lg font-wide">{ distanceData.duration_text }</span>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3 mt-3">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>{ distanceData.total_miles } miles × ${ distanceData.price_per_mile.toFixed( 2 ) }/mi</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-500">Estimated Total</span>
                    <span className="text-2xl font-bold text-gold font-wide">${ distanceData.total_price.toFixed( 2 ) }</span>
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
