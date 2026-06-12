import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/db";
import { bookingRecordToBookingData } from "@/lib/booking-data";

export async function GET( req: Request ) {
  try {
    const { searchParams } = new URL( req.url );
    const reference = searchParams.get( "reference" );
    const email = searchParams.get( "email" );

    if ( !reference || !email ) {
      return NextResponse.json(
        { success: false, error: "Booking reference and email are required" },
        { status: 400 }
      );
    }

    const booking = getBookingByReference( reference.trim().toUpperCase() );
    if ( !booking || booking.email.toLowerCase() !== email.trim().toLowerCase() ) {
      return NextResponse.json(
        { success: false, error: "Booking not found. Please check your booking reference and email." },
        { status: 404 }
      );
    }

    return NextResponse.json( {
      success: true,
      booking: bookingRecordToBookingData( booking ),
    } );
  } catch ( error ) {
    console.error( "Error fetching booking:", error );
    return NextResponse.json(
      { success: false, error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
