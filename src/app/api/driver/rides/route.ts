import { NextResponse } from "next/server";
import { getBookingsForChauffeur } from "@/lib/db";
import { getDriverSession, unauthorizedResponse } from "@/lib/driver-auth";
import { bookingRecordToDriverRide } from "@/lib/driver-ride";

export async function GET( req: Request ) {
  try {
    const session = getDriverSession( req );
    if ( !session ) return unauthorizedResponse();

    const rides = getBookingsForChauffeur( session.chauffeurId )
      .map( bookingRecordToDriverRide )
      .sort( ( a, b ) => `${ a.date } ${ a.time }`.localeCompare( `${ b.date } ${ b.time }` ) );

    return NextResponse.json( { success: true, rides } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to load rides";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
