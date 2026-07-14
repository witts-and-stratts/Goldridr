import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/db";
import { getRequestSession, unauthorizedResponse } from "@/lib/driver-auth";
import { bookingRecordToDriverRide } from "@/lib/driver-ride";

function parseScanPayload( raw: string ): { reference: string; email: string | null } | null {
  const value = raw.trim();
  if ( !value ) return null;

  try {
    const url = new URL( value );
    const reference = url.searchParams.get( "reference" );
    if ( reference ) return { reference, email: url.searchParams.get( "email" ) };
  } catch {}

  try {
    const parsed = JSON.parse( value );
    if ( parsed && typeof parsed === "object" && typeof parsed.reference === "string" ) {
      return {
        reference: parsed.reference,
        email: typeof parsed.email === "string" ? parsed.email : null,
      };
    }
  } catch {}

  if ( /^[A-Za-z0-9-]{4,32}$/.test( value ) ) return { reference: value, email: null };
  return null;
}

export async function POST( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return unauthorizedResponse();

    const body = await req.json();
    const raw = typeof body.payload === "string" ? body.payload : "";
    const scan = parseScanPayload( raw );

    if ( !scan ) {
      return NextResponse.json( { success: false, error: "Unrecognized QR code" }, { status: 400 } );
    }

    const booking = await getBookingByReference( scan.reference.trim().toUpperCase() );
    if ( !booking ) {
      return NextResponse.json( { success: false, error: "No booking found for this QR code" }, { status: 404 } );
    }

    if ( scan.email && booking.email.toLowerCase() !== scan.email.trim().toLowerCase() ) {
      return NextResponse.json( { success: false, error: "QR code does not match the booking on file" }, { status: 404 } );
    }

    return NextResponse.json( { success: true, ride: bookingRecordToDriverRide( booking ) } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to look up QR code";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
