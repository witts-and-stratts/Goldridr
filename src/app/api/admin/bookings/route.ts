import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { PastBookingTimeError } from "@/lib/booking-time";
import {
  deleteBooking,
  getAllBookings,
  getBookingByReference,
  getBookingsForChauffeur,
  updateBookingChauffeur,
  updateBookingSchedule,
  updateBookingStatus,
} from "@/lib/pocketbase/repository";
import { createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";

export async function GET( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    const bookings = session.role === "admin"
      ? await getAllBookings()
      : await getBookingsForChauffeur( session.chauffeurId! );
    
    // Parse the JSON string from tripDetails into objects
    const parsedBookings = bookings.map( booking => {
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
        const booking = await getBookingByReference( reference );
        if ( booking ) await createPocketBaseBookingStatusUpdate( booking );
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
