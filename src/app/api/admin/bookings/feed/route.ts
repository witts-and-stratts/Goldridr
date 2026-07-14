import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { getAllBookings, getBookingsForChauffeur } from "@/lib/db";
import { getRequestSession } from "@/lib/driver-auth";

// Helper to format date strings to RFC 5545 iCal format: YYYYMMDDTHHMMSSZ
function formatICalDate( dateStr: string, timeStr: string, offsetHours = 0 ): string {
  try {
    // If the date is loaded as standard string YYYY-MM-DD, parsing it with time works
    const combined = new Date( `${ dateStr }T${ timeStr }:00` );
    if ( isNaN( combined.getTime() ) ) {
      return dateStr.replace( /-/g, "" ) + "T000000Z";
    }
    if ( offsetHours > 0 ) {
      combined.setHours( combined.getHours() + offsetHours );
    }
    return combined.toISOString().replace( /[-:]/g, "" ).split( "." )[ 0 ] + "Z";
  } catch {
    return dateStr.replace( /-/g, "" ) + "T000000Z";
  }
}

// Escape simple characters for iCal strings
function escapeICalText( text?: string ): string {
  if ( !text ) return "";
  return text
    .replace( /\\/g, "\\\\" )
    .replace( /,/g, "\\," )
    .replace( /;/g, "\\;" )
    .replace( /\n/g, "\\n" )
    .replace( /\r/g, "" );
}

export async function GET( request: Request ) {
  try {
    const url = new URL( request.url );
    const feedToken = url.searchParams.get( "token" );
    const session = feedToken
      ? verifySessionToken( feedToken )
      : await getRequestSession( request );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    const bookings = session.role === "admin"
      ? await getAllBookings()
      : await getBookingsForChauffeur( session.chauffeurId! );

    // Filter out cancelled and rejected bookings
    const activeBookings = bookings.filter( 
      b => b.status !== "cancelled" && b.status !== "rejected" 
    );

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Goldridr//Chauffeur Operations Feed//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Goldridr Bookings Feed",
      "X-WR-TIMEZONE:America/Chicago",
      "X-WR-CALDESC:Chauffeur reservations dispatch schedule for Goldridr.",
    ];

    for ( const booking of activeBookings ) {
      let details: Record<string, string | number> = {};
      try {
        if ( booking.tripDetails ) {
          details = JSON.parse( booking.tripDetails );
        }
      } catch ( e ) {
        console.error( "JSON parsing failed for booking feed:", e );
      }

      const pickup = String( details.pickupLocation || details.pickup || "N/A" );
      const dropoff = String( details.dropoffLocation || details.destination || "N/A" );
      const flightNumber = String( details.flightNumber || "" );
      const passengers = String( details.passengers || "1" );
      const durationHours = Number( details.durationHours ) || 1;

      // Format description block with clear details for mobile calendars
      const descriptionLines = [
        `Passenger: ${ booking.name }`,
        `Phone: ${ booking.phone || "N/A" }`,
        `Email: ${ booking.email }`,
        `Reference: ${ booking.reference }`,
        `Service Type: ${ booking.tripType.toUpperCase() }`,
        `Pickup Location: ${ pickup }`,
      ];

      if ( booking.tripType !== "hourly" ) {
        descriptionLines.push( `Dropoff Location: ${ dropoff }` );
      } else {
        descriptionLines.push( `Duration: ${ durationHours } Hours` );
      }

      if ( flightNumber ) {
        descriptionLines.push( `Flight Number: ${ flightNumber }` );
      }
      
      descriptionLines.push( `Passengers count: ${ passengers }` );
      
      if ( booking.notes ) {
        descriptionLines.push( `Special Notes: ${ booking.notes }` );
      }

      const description = escapeICalText( descriptionLines.join( "\n" ) );
      const summary = escapeICalText( `Chauffeur: ${ booking.name } [${ booking.tripType.toUpperCase() }] (${ booking.reference })` );
      const location = escapeICalText( pickup );

      const startTimestamp = formatICalDate( booking.date, booking.time );
      const endTimestamp = formatICalDate( booking.date, booking.time, durationHours );
      const createdTimestamp = booking.createdAt
        ? new Date( booking.createdAt ).toISOString().replace( /[-:]/g, "" ).split( "." )[ 0 ] + "Z"
        : startTimestamp;

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${ booking.reference }`,
        `DTSTAMP:${ createdTimestamp }`,
        `DTSTART:${ startTimestamp }`,
        `DTEND:${ endTimestamp }`,
        `SUMMARY:${ summary }`,
        `DESCRIPTION:${ description }`,
        `LOCATION:${ location }`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }

    icsContent.push( "END:VCALENDAR" );

    // Return the response with standard iCalendar MIME type headers
    return new NextResponse( icsContent.join( "\r\n" ), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="goldridr-bookings.ics"',
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    } );
  } catch ( error: unknown ) {
    unstable_rethrow( error );
    console.error( "Failed to generate iCal feed:", error );
    return NextResponse.json( 
      { success: false, error: "Failed to generate calendar feed" }, 
      { status: 500 } 
    );
  }
}
