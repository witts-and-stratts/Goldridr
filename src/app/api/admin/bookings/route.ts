import { NextResponse } from "next/server";
import { getAllBookings, updateBookingStatus, updateBookingChauffeur, deleteBooking } from "@/lib/db";

export async function GET() {
  try {
    const bookings = getAllBookings();
    
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
    const { reference, status, chauffeurId } = await req.json();

    if ( !reference ) {
      return NextResponse.json(
        { success: false, error: "Missing booking reference" },
        { status: 400 }
      );
    }

    let updated = false;

    if ( status !== undefined ) {
      updated = updateBookingStatus( reference, status );
    }

    if ( chauffeurId !== undefined ) {
      // chauffeurId could be a number or null to unassign
      updated = updateBookingChauffeur( reference, chauffeurId );
    }

    if ( updated ) {
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
    console.error( "Error updating booking details:", error );
    const message = error instanceof Error ? error.message : "Failed to update booking";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const { searchParams } = new URL( req.url );
    const reference = searchParams.get( "reference" );

    if ( !reference ) {
      return NextResponse.json(
        { success: false, error: "Missing reference query parameter" },
        { status: 400 }
      );
    }

    const deleted = deleteBooking( reference );

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
