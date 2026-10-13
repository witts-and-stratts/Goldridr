import "server-only";

import type { BookingRecord } from "@/lib/pocketbase/repository";
import { bookingRecordToResponses } from "@/lib/booking-data";

export interface DriverRide {
  reference: string;
  /** The booking this ride belongs to; differs from `reference` for a round trip's return leg. */
  bookingReference: string;
  leg: "outbound" | "return" | null;
  status: string;
  chauffeurId: string | null;
  tripType: string;
  date: string;
  time: string;
  duration: number;
  customerName: string;
  customerPhone: string | null;
  pickup: string | null;
  destination: string | null;
  passengers: string | null;
  flightNumber: string | null;
  terminal: string | null;
  estimatedPrice: string | null;
  notes: string | null;
}

export function bookingRecordToDriverRide( booking: BookingRecord ): DriverRide {
  const responses = bookingRecordToResponses( booking );

  return {
    reference: booking.reference,
    bookingReference: booking.bookingReference || booking.reference,
    leg: booking.leg ?? null,
    status: booking.status,
    chauffeurId: booking.chauffeurId ?? null,
    tripType: booking.tripType,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    customerName: booking.name,
    customerPhone: booking.phone || null,
    pickup: responses.pickup ?? null,
    destination: responses.destination ?? null,
    passengers: responses.passengers ?? null,
    flightNumber: responses.flight_number ?? null,
    terminal: responses.terminal ?? null,
    estimatedPrice: responses.estimated_total ?? responses.estimated_price ?? null,
    notes: booking.notes || null,
  };
}
