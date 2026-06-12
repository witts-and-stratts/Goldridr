import "server-only";

import type { BookingRecord } from "@/lib/db";
import { bookingRecordToResponses } from "@/lib/booking-data";

export interface DriverRide {
  reference: string;
  status: string;
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
  estimatedPrice: string | null;
  notes: string | null;
}

export function bookingRecordToDriverRide( booking: BookingRecord ): DriverRide {
  const responses = bookingRecordToResponses( booking );

  return {
    reference: booking.reference,
    status: booking.status,
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
    estimatedPrice: responses.estimated_total ?? responses.estimated_price ?? null,
    notes: booking.notes || null,
  };
}
