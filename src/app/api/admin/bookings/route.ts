import { NextResponse } from "next/server";
import z from "zod/v4";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { PastBookingTimeError } from "@/lib/booking-time";
import {
  DiscountCodeError,
  deleteBooking,
  getAllRides,
  getRideByReference,
  getRidesForChauffeur,
  updateBookingChauffeur,
  updateBookingSchedule,
  updateBookingStatus,
} from "@/lib/pocketbase/repository";
import { createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";
import { bookingRecordToBookingData } from "@/lib/booking-data";
import { BookingRequestSchema, createBookingRequest, ReturnTimeError } from "@/lib/booking-create";
import { BookingPricingSchema, type BookingPricingOverride } from "@/lib/booking-pricing";

export async function POST( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const body = await req.json();
    const parsed = BookingRequestSchema.safeParse( body );
    if ( !parsed.success ) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) },
        { status: 400 }
      );
    }

    let pricing: BookingPricingOverride | undefined;
    if ( body?.pricing !== undefined ) {
      const pricingParsed = BookingPricingSchema.safeParse( body.pricing );
      if ( !pricingParsed.success ) {
        return NextResponse.json(
          { success: false, error: "Invalid pricing", details: z.prettifyError( pricingParsed.error ) },
          { status: 400 }
        );
      }
      pricing = pricingParsed.data;
    }

    const outcome = await createBookingRequest( req, parsed.data, { pricing } );

    if ( outcome.status === "clash" ) {
      return NextResponse.json(
        {
          success: false,
          error: "clash",
          message: outcome.leg === "return"
            ? "All of our chauffeurs are already reserved for your return trip at that time."
            : "All of our chauffeurs are already reserved at that time.",
          leg: outcome.leg,
          alternativeSlots: outcome.alternativeSlots,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        booking: await bookingRecordToBookingData( outcome.booking ),
        bookingId: outcome.booking.id,
        message: outcome.message,
      },
      { status: 201 }
    );
  } catch ( error: unknown ) {
    if ( error instanceof DiscountCodeError ) {
      return NextResponse.json(
        { success: false, error: "discount_code", message: error.message },
        { status: 400 }
      );
    }
    if ( error instanceof ReturnTimeError ) {
      return NextResponse.json(
        { success: false, error: "return_time", message: error.message },
        { status: 400 }
      );
    }
    if ( error instanceof PastBookingTimeError ) {
      return NextResponse.json(
        { success: false, error: "past_time", message: error.message },
        { status: 400 }
      );
    }
    console.error( "Error creating admin booking:", error );
    const message = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function GET( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    const bookings = session.role === "admin"
      ? await getAllRides()
      : await getRidesForChauffeur( session.chauffeurId! );

    // Each leg of a round trip is listed as its own ride; `bookingReference` and `leg` tie it back to the booking.
    const parsedBookings = bookings.map( ride => {
      const booking = { ...ride, returnLeg: undefined, outboundStatus: undefined };
      let tripDetailsObj = {};
      try {
        if ( booking.tripDetails ) {
          tripDetailsObj = JSON.parse( booking.tripDetails );
        }
      } catch ( err ) {
        console.error( "Failed to parse tripDetails JSON:", err );
      }
      return {
        ...booking,
        tripDetails: tripDetailsObj
      };
    } );

    return NextResponse.json( {
      success: true,
      bookings: parsedBookings,
    } );
  } catch ( error: unknown ) {
    console.error( "Error fetching admin bookings:", error );
    const message = error instanceof Error ? error.message : "Failed to fetch bookings";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function PATCH( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const { reference, status, chauffeurId, date, time, duration } = await req.json();

    if ( !reference ) {
      return NextResponse.json(
        { success: false, error: "Missing booking reference" },
        { status: 400 }
      );
    }

    let updated = false;
    let statusUpdated = false;

    if ( status !== undefined ) {
      statusUpdated = await updateBookingStatus( reference, status );
      updated = statusUpdated;
    }

    if ( chauffeurId !== undefined ) {
      // chauffeurId could be a number or null to unassign
      updated = await updateBookingChauffeur( reference, chauffeurId );
    }

    if ( date !== undefined || time !== undefined || duration !== undefined ) {
      if ( typeof date !== "string" || typeof time !== "string" ) {
        return NextResponse.json(
          { success: false, error: "Both date and time are required when rescheduling" },
          { status: 400 }
        );
      }
      updated = await updateBookingSchedule( reference, {
        date,
        time,
        duration: duration === undefined ? undefined : Number( duration ),
      } ) || updated;
    }

    if ( updated ) {
      if ( statusUpdated ) {
        const ride = await getRideByReference( reference );
        if ( ride ) await createPocketBaseBookingStatusUpdate( ride );
      }
      return NextResponse.json( {
        success: true,
        message: "Booking updated successfully"
      } );
    } else {
      return NextResponse.json(
        { success: false, error: "Booking not found or no changes made" },
        { status: 404 }
      );
    }
  } catch ( error: unknown ) {
    if ( error instanceof PastBookingTimeError ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error( "Error updating booking details:", error );
    const message = error instanceof Error ? error.message : "Failed to update booking";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const { searchParams } = new URL( req.url );
    const reference = searchParams.get( "reference" );

    if ( !reference ) {
      return NextResponse.json(
        { success: false, error: "Missing reference query parameter" },
        { status: 400 }
      );
    }

    const deleted = await deleteBooking( reference );

    if ( deleted ) {
      return NextResponse.json( {
        success: true,
        message: "Booking deleted successfully"
      } );
    } else {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }
  } catch ( error: unknown ) {
    console.error( "Error deleting booking:", error );
    const message = error instanceof Error ? error.message : "Failed to delete booking";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
