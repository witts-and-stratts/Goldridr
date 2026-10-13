import { NextResponse } from "next/server";
import z from "zod/v4";
import { DiscountCodeError } from "@/lib/pocketbase/repository";
import { bookingRecordToBookingData } from "@/lib/booking-data";
import {
  assertFutureBookingTime,
  PastBookingTimeError,
} from "@/lib/booking-time";
import {
  BookingRequestSchema,
  createBookingRequest,
} from "@/lib/booking-create";
import { checkSlotAvailability } from "@/lib/booking-availability";

export { BookingRequestSchema };

export async function POST( req: Request ) {
  try {
    const parsed = BookingRequestSchema.safeParse( await req.json() );

    if ( !parsed.success ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: z.prettifyError( parsed.error ),
        },
        { status: 400 }
      );
    }

    const outcome = await createBookingRequest( req, parsed.data );

    if ( outcome.status === "clash" ) {
      return NextResponse.json(
        {
          success: false,
          error: "clash",
          message: "All of our chauffeurs are already reserved at that time.",
          alternativeSlots: outcome.alternativeSlots,
        },
        { status: 409 }
      );
    }

    return NextResponse.json( {
      success: true,
      booking: await bookingRecordToBookingData( outcome.booking ),
      bookingId: outcome.booking.id,
      message: outcome.message,
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

  const chauffeurId = chauffeurIdParam?.trim() || undefined;
  if ( chauffeurIdParam && !chauffeurId ) {
    return NextResponse.json(
      { success: false, error: "chauffeurId is invalid" },
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
