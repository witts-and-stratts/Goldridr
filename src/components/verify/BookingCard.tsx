"use client";

import { BookingData } from "@/types/booking";
import { formatShortDate, formatTime, formatFullDate } from "@/lib/date-utils";
import { getStatusColor, getStatusIcon } from "@/lib/booking-status";
import { Plane, User } from "lucide-react";
import { motion } from "motion/react";

// Reusable divider component
const Divider = () => (
  <div className="border-t border-dashed border-gray-800 mx-5" />
);

// Info field component for consistent styling
interface InfoFieldProps {
  label: string;
  value: string | number;
  align?: "left" | "center" | "right";
  size?: "md" | "lg";
  capitalize?: boolean;
}

const InfoField = ( { label, value, align = "left", size = "lg", capitalize }: InfoFieldProps ) => (
  <div className={ align === "right" ? "text-right" : align === "center" ? "text-center" : "" }>
    <span className="block text-xs text-gray-500">{ label }</span>
    <span className={ `font-bold text-${ size } font-wide ${ capitalize ? "capitalize" : "" }` }>
      { value }
    </span>
  </div>
);

interface BookingCardProps {
  booking: BookingData;
  routeMapUrl: string | null;
  onMapClick: () => void;
}

export function BookingCard( { booking, routeMapUrl, onMapClick }: BookingCardProps ) {
  const { responses, attendees, status, reference, start } = booking;
  const hasFlightNumber = !!responses?.flight_number;
  const hasLocations = responses?.pickup || responses?.destination;

  return (
    <motion.div
      initial={ { opacity: 0, y: 20 } }
      animate={ { opacity: 1, y: 0 } }
      exit={ { opacity: 0, y: 20 } }
      className="overflow-hidden rounded-[10px] bg-black/60 text-white text-sm shadow-lg border border-border/20"
    >
      {/* Header with Reference and Status */ }
      <div className="p-5 pb-4 flex items-center justify-between">
        <div>
          <span className="block text-xs text-gray-500">Booking Reference</span>
          <span className="font-mono text-xl text-[#D4AF37] font-bold">{ reference }</span>
        </div>
        <div className={ `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-wide uppercase tracking-wider border ${ getStatusColor( status ) }` }>
          { getStatusIcon( status ) }
          <span>{ status }</span>
        </div>
      </div>

      <Divider />

      {/* Flight Section (if flight number exists) */ }
      { hasFlightNumber && (
        <>
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Plane className="size-5 text-[#D4AF37]" />
              <span className="font-wide text-lg tracking-wider">{ responses.flight_number }</span>
            </div>

            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Pickup</span>
              <span>Dropoff</span>
            </div>

            <div className="flex justify-between items-center mb-1">
              <span className="text-2xl font-bold font-wide text-white">{ formatTime( start ) }</span>
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="h-px w-full bg-gray-600 relative">
                  <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37] rotate-90" />
                </div>
              </div>
              <span className="text-2xl font-bold font-wide text-white">{ responses.duration || "—" }</span>
            </div>

            <div className="text-center text-gray-500 text-sm mt-2">
              { formatFullDate( start ) }
            </div>
          </div>
          <Divider />
        </>
      ) }

      {/* Trip Details Row (if no flight) */ }
      { !hasFlightNumber && (
        <>
          <div className="p-5 pt-4 space-y-4">
            <div className="flex justify-between">
              <InfoField label="Date" value={ formatShortDate( start ) } />
              <InfoField label="Time" value={ formatTime( start ) } align="right" />
            </div>

            { responses?.passengers && (
              <div className="flex justify-between">
                <InfoField label="Passengers" value={ responses.passengers } />
                <InfoField label="Trip Type" value={ responses.booking_type || "—" } align="right" capitalize />
              </div>
            ) }
          </div>
          <Divider />
        </>
      ) }

      {/* Info Row for flights */ }
      { hasFlightNumber && (
        <>
          <div className="p-5 pt-4">
            <div className="flex justify-between">
              <InfoField label="Date" value={ formatShortDate( start ) } />
              <InfoField label="Passengers" value={ responses.passengers || "1" } align="center" />
              <InfoField label="Type" value={ responses.booking_type || "—" } align="right" capitalize />
            </div>
          </div>
          <Divider />
        </>
      ) }

      {/* Locations with Map */ }
      { hasLocations && (
        <>
          <div className="p-5 pt-4 space-y-3 flex justify-between gap-5">
            <div className="flex-2 flex flex-col gap-2">
              { responses?.pickup && (
                <div>
                  <span className="block text-xs text-gray-500">Pickup Location</span>
                  <span className="font-normal text-white text-base">{ responses.pickup }</span>
                </div>
              ) }
              { responses?.pickup && responses?.destination && (
                <div className="border-t border-dashed border-gray-800" />
              ) }
              { responses?.destination && (
                <div>
                  <span className="block text-xs text-gray-500">Dropoff Location</span>
                  <span className="font-normal text-white text-base">{ responses.destination }</span>
                </div>
              ) }
            </div>

            {/* Map Preview */ }
            { routeMapUrl && (
              <button
                type="button"
                onClick={ onMapClick }
                className="w-24 aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#D4AF37] transition-colors flex-shrink-0"
              >
                <img
                  src={ routeMapUrl }
                  alt="Route map"
                  className="w-full h-full object-cover"
                />
              </button>
            ) }
          </div>
          <Divider />
        </>
      ) }

      {/* Distance & Pricing */ }
      <div className="p-5 pt-4 space-y-3">
        <div className="flex justify-between">
          { responses?.estimated_distance && (
            <InfoField label="Distance" value={ responses.estimated_distance } />
          ) }
          { responses?.duration && (
            <InfoField label="Duration" value={ responses.duration } align="right" />
          ) }
        </div>

        { responses?.estimated_total && (
          <div className="border-t border-gray-800 pt-3 mt-3">
            <div className="flex justify-between items-end">
              <span className="text-sm text-gray-400">Estimated Total</span>
              <span className="text-2xl font-bold text-[#D4AF37] font-wide">{ responses.estimated_total }</span>
            </div>
          </div>
        ) }
      </div>

      <Divider />

      {/* Contact Information */ }
      { attendees?.[ 0 ] && (
        <div className="p-5 pt-4">
          <p className="text-xs text-gray-500 mb-3">Booked By</p>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <User className="size-6 text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-bold text-white">{ attendees[ 0 ].name }</p>
              <p className="text-sm text-gray-400">{ attendees[ 0 ].email }</p>
            </div>
          </div>
        </div>
      ) }

      {/* Notes */ }
      { responses?.notes && (
        <>
          <Divider />
          <div className="p-5 pt-4">
            <p className="text-xs text-gray-500 mb-2">Special Requests</p>
            <p className="text-white bg-white/5 p-3 rounded-lg text-sm">{ responses.notes }</p>
          </div>
        </>
      ) }
    </motion.div>
  );
}
