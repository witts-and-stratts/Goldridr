import { NextResponse } from "next/server";
import { getBookingByReference, updateBookingStatus } from "@/lib/db";
import { getDriverSession, unauthorizedResponse } from "@/lib/driver-auth";
import { bookingRecordToDriverRide } from "@/lib/driver-ride";

const DRIVER_ALLOWED_STATUSES = [ "confirmed", "completed" ] as const;

type RouteContext = { params: Promise<{ reference: string }> };

export async function GET( req: Request, context: RouteContext ) {
  try {
    const session = getDriverSession( req );
    if ( !session ) return unauthorizedResponse();

    const { reference } = await context.params;
    const booking = getBookingByReference( reference.trim().toUpperCase() );

    if ( !booking || booking.chauffeurId !== session.chauffeurId ) {
      return NextResponse.json(
        { success: false, error: "Ride not found" },
        { status: 404 }
      );
    }

    return NextResponse.json( { success: true, ride: bookingRecordToDriverRide( booking ) } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to load ride";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function PATCH( req: Request, context: RouteContext ) {
  try {
    const session = getDriverSession( req );
    if ( !session ) return unauthorizedResponse();

    const { reference } = await context.params;
    const booking = getBookingByReference( reference.trim().toUpperCase() );

    if ( !booking || booking.chauffeurId !== session.chauffeurId ) {
      return NextResponse.json(
        { success: false, error: "Ride not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";

    if ( !( DRIVER_ALLOWED_STATUSES as readonly string[] ).includes( status ) ) {
      return NextResponse.json(
        { success: false, error: `Status must be one of: ${ DRIVER_ALLOWED_STATUSES.join( ", " ) }` },
        { status: 400 }
      );
    }

    if ( booking.status === "cancelled" || booking.status === "rejected" ) {
      return NextResponse.json(
        { success: false, error: "This ride was cancelled and can no longer be updated" },
        { status: 409 }
      );
    }

    updateBookingStatus( booking.reference, status );
    const updated = getBookingByReference( booking.reference )!;

    return NextResponse.json( { success: true, ride: bookingRecordToDriverRide( updated ) } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to update ride";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
