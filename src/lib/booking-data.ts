import { zonedDateTimeToDate } from "@/lib/notifications/time";
import type { BookingRecord } from "@/lib/db";
import { getNotificationTimeZone } from "@/lib/admin-settings";
import type { BookingData, BookingResponses } from "@/types/booking";

function parseTripDetails( tripDetails: string ): Record<string, unknown> {
  try {
    const parsed = JSON.parse( tripDetails );
    return parsed && typeof parsed === "object" && !Array.isArray( parsed ) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function formatCurrency( value: unknown ): string | undefined {
  if ( value === null || value === undefined || value === "" ) return undefined;
  const numeric = typeof value === "number" ? value : Number( value );
  if ( Number.isFinite( numeric ) ) {
    return new Intl.NumberFormat( "en-US", {
      style: "currency",
      currency: "USD",
    } ).format( numeric );
  }
  return String( value );
}

function formatDistance( value: unknown ): string | undefined {
  if ( value === null || value === undefined || value === "" ) return undefined;
  if ( typeof value === "number" ) {
    return `${ value } miles`;
  }
  return String( value );
}

function formatDuration( booking: BookingRecord, tripDetails: Record<string, unknown> ): string {
  const explicit = tripDetails.estimatedDuration || tripDetails.duration;
  if ( typeof explicit === "string" && explicit.trim() ) return explicit;
  if ( typeof explicit === "number" && Number.isFinite( explicit ) ) return `${ explicit } mins`;
  if ( typeof tripDetails.durationHours === "number" && Number.isFinite( tripDetails.durationHours ) ) {
    return `${ tripDetails.durationHours } hours`;
  }
  return `${ booking.duration } mins`;
}

export function bookingRecordToResponses( booking: BookingRecord ): BookingResponses {
  const tripDetails = parseTripDetails( booking.tripDetails );

  return {
    pickup: String( tripDetails.pickupLocation || tripDetails.pickup || "" ) || undefined,
    destination: String( tripDetails.dropoffLocation || tripDetails.destination || "" ) || undefined,
    booking_type: booking.tripType,
    estimated_distance: formatDistance( tripDetails.estimatedDistance ),
    estimated_price: formatCurrency( tripDetails.estimatedPrice ?? tripDetails.estimatedTotal ),
    estimated_total: formatCurrency( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice ),
    passengers: tripDetails.passengers !== undefined && tripDetails.passengers !== null
      ? String( tripDetails.passengers )
      : undefined,
    flight_number: tripDetails.flightNumber ? String( tripDetails.flightNumber ) : undefined,
    duration: formatDuration( booking, tripDetails ),
    notes: booking.notes || undefined,
    booking_reference: booking.reference,
  };
}

export async function bookingRecordToBookingData( booking: BookingRecord ): Promise<BookingData> {
  const tripDetails = parseTripDetails( booking.tripDetails );
  const startDate = zonedDateTimeToDate( booking.date, booking.time );
  const start = startDate.toISOString();
  const end = new Date( startDate.getTime() + booking.duration * 60_000 ).toISOString();

  return {
    uid: booking.reference,
    reference: booking.reference,
    status: booking.status,
    title: `Goldridr booking ${ booking.reference }`,
    start,
    end,
    attendees: [
      {
        name: booking.name,
        email: booking.email,
        timeZone: await getNotificationTimeZone(),
      },
    ],
    responses: bookingRecordToResponses( booking ),
    metadata: {
      ...tripDetails,
      bookingReference: booking.reference,
      chauffeurId: booking.chauffeurId ?? null,
      status: booking.status,
      createdAt: booking.createdAt,
    },
  };
}
