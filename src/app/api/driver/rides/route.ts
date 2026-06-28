import { NextResponse } from "next/server";
import { getAllBookings, getBookingsForChauffeur } from "@/lib/db";
import { getAppSession, unauthorizedResponse } from "@/lib/driver-auth";
import { bookingRecordToDriverRide } from "@/lib/driver-ride";

export async function GET( req: Request ) {
  try {
    const session = getAppSession( req );
    if ( !session ) return unauthorizedResponse();

    // Admins get dispatcher-wide visibility; chauffeurs only their own rides.
    const bookings = session.role === "admin"
      ? await getAllBookings()
      : await getBookingsForChauffeur( session.chauffeurId! );

    const rides = bookings
      .map( bookingRecordToDriverRide )
      .sort( ( a, b ) => `${ a.date } ${ a.time }`.localeCompare( `${ b.date } ${ b.time }` ) );

    return NextResponse.json( { success: true, rides } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to load rides";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
