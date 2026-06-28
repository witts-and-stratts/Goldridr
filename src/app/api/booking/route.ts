import { NextResponse } from "next/server";
import z from "zod/v4";
import {
  checkBlockedClash,
  checkBookingClash,
  findAvailableChauffeur,
  DiscountCodeError,
  saveBooking,
} from "@/lib/db";
import { bookingRecordToBookingData } from "@/lib/booking-data";
import { getNotificationTimeZone } from "@/lib/admin-settings";
import {
  assertFutureBookingTime,
  isBookingTimeInFuture,
  PastBookingTimeError,
} from "@/lib/booking-time";
import { zonedDateTimeToDate } from "@/lib/notifications/time";

const AttendeeSchema = z.object( {
  name: z.string().min( 1, "Attendee name is required" ),
  email: z.email( "Invalid email address" ),
  phone: z.string().optional(),
  timeZone: z.string().optional(),
  language: z.string().optional(),
} );

const TripDetailsSchema = z.object( {
  pickupLocation: z.string().optional(),
  pickup: z.string().optional(),
  dropoffLocation: z.string().optional(),
  destination: z.string().optional(),
  estimatedDistance: z.union( [ z.string(), z.number() ] ).optional(),
  estimatedPrice: z.number().optional(),
  estimatedTotal: z.number().optional(),
  estimatedDuration: z.string().optional(),
  estimatedDurationMinutes: z.number().optional(),
  passengers: z.union( [ z.string(), z.number() ] ).optional(),
  flightNumber: z.string().optional(),
} ).loose();

const BookingRequestSchema = z.object( {
  date: z.iso.date( "A valid date is required" ),
  time: z.string().regex( /^(?:[01]\d|2[0-3]):[0-5]\d$/, "A valid time is required" ),
  duration: z.number().int().positive().max( 24 * 60 ).optional().default( 60 ),
  attendee: AttendeeSchema,
  notes: z.string().optional(),
  smsOptIn: z.boolean().optional().default( false ),
  smsConsentVersion: z.string().optional().default( "2026-01" ),
  tripType: z.enum( [ "airport", "city", "hourly" ] ).optional().default( "airport" ),
  tripDetails: TripDetailsSchema.optional(),
  discountCode: z.string().trim().optional().default( "" ),
} );

type BookingRequestInput = z.infer<typeof BookingRequestSchema>;

function generateBookingReference(): string {
  const timestamp = Date.now().toString( 36 ).toUpperCase();
  const random = Math.random().toString( 36 ).substring( 2, 6 ).toUpperCase();
  return `GR-${ timestamp.slice( -4 ) }${ random }`;
}

async function formatTimeInZone( date: Date ): Promise<string> {
  return new Intl.DateTimeFormat( "en-GB", {
    timeZone: await getNotificationTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  } ).format( date );
}

interface AlternativeSlot {
  date: string;
  time: string;
}

const MAX_ALTERNATIVES = 4;

function shiftDateString( date: string, days: number ): string {
  const base = new Date( `${ date }T12:00:00` );
  base.setDate( base.getDate() + days );
  const year = base.getFullYear();
  const month = String( base.getMonth() + 1 ).padStart( 2, "0" );
  const day = String( base.getDate() ).padStart( 2, "0" );
  return `${ year }-${ month }-${ day }`;
}

async function isSlotFree( date: string, time: string, durationMinutes: number, chauffeurId?: number | null ): Promise<boolean> {
  if ( !isBookingTimeInFuture( date, time, new Date(), await getNotificationTimeZone() ) ) {
    return false;
  }

  if ( chauffeurId !== undefined && chauffeurId !== null ) {
    const bookingClash = await checkBookingClash( date, time, durationMinutes, chauffeurId );
    const blockedClash = await checkBlockedClash( date, time, durationMinutes, chauffeurId );
    return !( bookingClash.clash || blockedClash.clash );
  }
  return !!await findAvailableChauffeur( date, time, durationMinutes );
}

async function getAlternativeSlots( date: string, time: string, durationMinutes: number, chauffeurId?: number | null ): Promise<AlternativeSlot[]> {
  const alternatives: AlternativeSlot[] = [];
  const timeZone = await getNotificationTimeZone();
  const requestedDate = zonedDateTimeToDate( date, time, timeZone );

  if ( Number.isNaN( requestedDate.getTime() ) ) return alternatives;

  // Nearby times on the requested day.
  const offsets = [ -30, -60, -90, -120, 30, 60, 90, 120, 150, 180, 210, 240 ];

  for ( const offset of offsets ) {
    const testDate = new Date( requestedDate.getTime() + offset * 60 * 1000 );
    const testTime = await formatTimeInZone( testDate );
    if ( await isSlotFree( date, testTime, durationMinutes, chauffeurId ) ) {
      alternatives.push( { date, time: testTime } );
      if ( alternatives.length >= MAX_ALTERNATIVES ) return alternatives;
    }
  }

  // Same time on the following days.
  for ( let dayOffset = 1; dayOffset <= 3; dayOffset++ ) {
    const testDate = shiftDateString( date, dayOffset );
    if ( await isSlotFree( testDate, time, durationMinutes, chauffeurId ) ) {
      alternatives.push( { date: testDate, time } );
      if ( alternatives.length >= MAX_ALTERNATIVES ) return alternatives;
    }
  }

  return alternatives;
}

async function checkSlotAvailability(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): Promise<{
  available: boolean;
  alternativeSlots: AlternativeSlot[];
  bookingClash: Awaited<ReturnType<typeof checkBookingClash>>;
  blockedClash: Awaited<ReturnType<typeof checkBlockedClash>>;
}> {
  const bookingClash = await checkBookingClash( date, time, durationMinutes, chauffeurId );
  const blockedClash = await checkBlockedClash( date, time, durationMinutes, chauffeurId );
  const available = chauffeurId !== undefined && chauffeurId !== null
    ? !( bookingClash.clash || blockedClash.clash )
    : !!await findAvailableChauffeur( date, time, durationMinutes );

  return {
    available,
    alternativeSlots: available ? [] : await getAlternativeSlots( date, time, durationMinutes, chauffeurId ),
    bookingClash,
    blockedClash,
  };
}

export async function POST( req: Request ) {
  try {
    const body = await req.json();
    const parseResult = BookingRequestSchema.safeParse( body );

    if ( !parseResult.success ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: z.prettifyError( parseResult.error ),
        },
        { status: 400 }
      );
    }

    const input: BookingRequestInput = parseResult.data;
    const durationMinutes = input.duration ?? 60;
    assertFutureBookingTime( input.date, input.time, new Date(), await getNotificationTimeZone() );
    const assignedChauffeur = await findAvailableChauffeur( input.date, input.time, durationMinutes );

    if ( !assignedChauffeur ) {
      return NextResponse.json(
        {
          success: false,
          error: "clash",
          message: "All of our chauffeurs are already reserved at that time.",
          alternativeSlots: await getAlternativeSlots( input.date, input.time, durationMinutes ),
        },
        { status: 409 }
      );
    }

    const bookingReference = generateBookingReference();
    const sqliteBooking = await saveBooking( {
      reference: bookingReference,
      tripType: input.tripType || "airport",
      date: input.date,
      time: input.time,
      duration: durationMinutes,
      name: input.attendee.name,
      email: input.attendee.email,
      phone: input.attendee.phone || "",
      notes: input.notes || "",
      status: "pending",
      tripDetails: JSON.stringify( input.tripDetails || {} ),
      discountCode: input.discountCode || null,
      chauffeurId: assignedChauffeur.id,
      smsConsentVersion: input.smsOptIn && input.attendee.phone ? input.smsConsentVersion : null,
      smsConsentedAt: input.smsOptIn && input.attendee.phone ? new Date().toISOString() : null,
    } );

    return NextResponse.json( {
      success: true,
      booking: await bookingRecordToBookingData( sqliteBooking ),
      bookingId: sqliteBooking.id,
      message: "Booking confirmed successfully",
    } );
  } catch ( error: unknown ) {
    if ( error instanceof DiscountCodeError ) {
      return NextResponse.json(
        { success: false, error: "discount_code", message: error.message },
        { status: 400 }
      );
    }
    if ( error instanceof PastBookingTimeError ) {
      return NextResponse.json(
        {
          success: false,
          error: "past_time",
          message: error.message,
        },
        { status: 400 }
      );
    }
    console.error( "Booking error:", error );
    const message = error instanceof Error ? error.message : "Failed to process booking";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function GET( req: Request ) {
  const { searchParams } = new URL( req.url );
  const date = searchParams.get( "date" );
  const time = searchParams.get( "time" );
  const durationParam = searchParams.get( "duration" );
  const chauffeurIdParam = searchParams.get( "chauffeurId" );

  if ( !date || !time || !durationParam ) {
    return NextResponse.json(
      { success: false, error: "Missing required params: date, time, duration" },
      { status: 400 }
    );
  }

  const duration = Number( durationParam );
  if ( !Number.isFinite( duration ) || duration <= 0 ) {
    return NextResponse.json(
      { success: false, error: "Duration must be a positive number" },
      { status: 400 }
    );
  }

  const chauffeurId = chauffeurIdParam ? Number( chauffeurIdParam ) : undefined;
  if ( chauffeurIdParam && !Number.isInteger( chauffeurId ) ) {
    return NextResponse.json(
      { success: false, error: "chauffeurId must be a whole number" },
      { status: 400 }
    );
  }

  try {
    assertFutureBookingTime( date, time );
    const availability = await checkSlotAvailability( date, time, duration, chauffeurId );

    return NextResponse.json( {
      success: true,
      available: availability.available,
      alternativeSlots: availability.alternativeSlots,
      bookingClash: availability.bookingClash,
      blockedClash: availability.blockedClash,
    } );
  } catch ( error: unknown ) {
    if ( error instanceof PastBookingTimeError ) {
      return NextResponse.json(
        { success: false, available: false, error: "past_time", message: error.message },
        { status: 400 }
      );
    }
    console.error( "Availability check error:", error );
    const message = error instanceof Error ? error.message : "Failed to check availability";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
