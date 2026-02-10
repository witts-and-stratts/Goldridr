import { NextResponse } from "next/server";

const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_API_VERSION = "2024-08-13";

export async function GET( req: Request ) {
  const apiKey = process.env.CAL_API_KEY;

  if ( !apiKey ) {
    return NextResponse.json(
      { success: false, error: "Cal.com API key not configured" },
      { status: 500 }
    );
  }

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

    // Fetch all bookings from Cal.com and search for matching reference and email
    // Note: Cal.com API doesn't have direct search by custom field, so we fetch and filter
    const response = await fetch( `${ CAL_API_BASE }/bookings?status=upcoming,past,cancelled&attendeeEmail=${ encodeURIComponent( email ) }`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "cal-api-version": CAL_API_VERSION,
        Authorization: `Bearer ${ apiKey }`,
      },
    } );

    const data = await response.json();
    
    // Debug log to see the structure
    console.log( "Cal.com bookings response:", JSON.stringify( data, null, 2 ) );

    if ( data.status === "success" && data.data ) {
      // Search through bookings to find one with matching reference
      const bookings = data.data;
      const matchingBooking = bookings.find( ( booking: any ) => {
        // Check multiple possible locations for booking reference
        const bookingRef = booking.responses?.booking_reference || 
                          booking.bookingFieldsResponses?.booking_reference ||
                          booking.metadata?.bookingReference;
        console.log( "Checking booking:", booking.uid, "ref:", bookingRef, "looking for:", reference );
        return bookingRef === reference;
      } );

      if ( matchingBooking ) {
        console.log( "Found matching booking:", JSON.stringify( matchingBooking, null, 2 ) );
        
        // Merge responses from different possible locations
        const responses = {
          ...( matchingBooking.bookingFieldsResponses || {} ),
          ...( matchingBooking.responses || {} ),
        };
        
        // Also check metadata for any stored data
        const metadata = matchingBooking.metadata || {};
        
        return NextResponse.json( {
          success: true,
          booking: {
            uid: matchingBooking.uid,
            reference: responses.booking_reference || metadata.bookingReference || reference,
            status: matchingBooking.status,
            title: matchingBooking.title,
            start: matchingBooking.start,
            end: matchingBooking.end,
            attendees: matchingBooking.attendees,
            responses: {
              pickup: responses.pickup || metadata.pickupLocation,
              destination: responses.destination || metadata.dropoffLocation,
              booking_type: responses.booking_type || metadata.tripType,
              estimated_distance: responses.estimated_distance || metadata.estimatedDistance,
              estimated_price: responses.estimated_price || metadata.estimatedPrice,
              estimated_total: responses.estimated_total || metadata.estimatedTotal,
              passengers: responses.passengers || metadata.passengers,
              flight_number: responses.flight_number || metadata.flightNumber,
              duration: responses.duration || metadata.estimatedDuration,
              notes: responses.notes || matchingBooking.notes,
              booking_reference: responses.booking_reference || metadata.bookingReference,
            },
            metadata: metadata,
            meetingUrl: matchingBooking.meetingUrl,
            location: matchingBooking.location,
          },
        } );
      }

      return NextResponse.json(
        { success: false, error: "Booking not found. Please check your booking reference and email." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "No bookings found for this email" },
      { status: 404 }
    );
  } catch ( error ) {
    console.error( "Error fetching booking:", error );
    return NextResponse.json(
      { success: false, error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
