import { NextResponse } from "next/server";
import { getBookingByReference, confirmBookingPin } from "@/lib/db";
import { getAppSession, unauthorizedResponse } from "@/lib/driver-auth";
import { bookingRecordToDriverRide } from "@/lib/driver-ride";

type RouteContext = { params: Promise<{ reference: string }> };

export async function POST( req: Request, context: RouteContext ) {
  try {
    const session = await getAppSession( req );
    if ( !session ) return unauthorizedResponse();

    const { reference } = await context.params;
    const ref = reference.trim().toUpperCase();

    const booking = await getBookingByReference( ref );
    if ( !booking || ( session.role !== "admin" && booking.chauffeurId !== session.chauffeurId ) ) {
      return NextResponse.json( { success: false, error: "Ride not found" }, { status: 404 } );
    }

    const body = await req.json().catch( () => ( {} ) );
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    if ( !/^\d{4}$/.test( pin ) ) {
      return NextResponse.json( { success: false, error: "PIN must be a 4-digit number" }, { status: 400 } );
    }

    const result = await confirmBookingPin( ref, pin );
    if ( !result.success ) {
      return NextResponse.json( { success: false, error: result.error }, { status: 400 } );
    }

    const updated = ( await getBookingByReference( ref ) )!;
    return NextResponse.json( { success: true, ride: bookingRecordToDriverRide( updated ) } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to confirm PIN";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
