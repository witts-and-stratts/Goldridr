import { NextResponse } from "next/server";
import { FlightProviderBudgetError, lookupFlight } from "@/lib/flights/service";
import { normalizeFlightLookupKey } from "@/lib/flights/types";

function invalidLookup() {
  return NextResponse.json( { error: "A valid flight number, date, and airport direction are required" }, { status: 400 } );
}

export async function GET( request: Request ) {
  const params = Object.fromEntries( new URL( request.url ).searchParams.entries() );
  const key = normalizeFlightLookupKey( params );
  if ( !key ) return invalidLookup();
  try {
    const result = await lookupFlight( key );
    if ( !result.flight ) {
      return NextResponse.json( { error: "No fresh cached or approved-source flight data is available", providerAvailable: result.providerAvailable }, { status: 404 } );
    }
    return NextResponse.json( result );
  } catch ( error ) {
    console.error( "Flight cache lookup failed", error );
    return NextResponse.json( { error: "Flight lookup failed" }, { status: 502 } );
  }
}

export async function POST( request: Request ) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return invalidLookup();
  }
  const key = normalizeFlightLookupKey( body );
  if ( !key ) return invalidLookup();
  try {
    const result = await lookupFlight( key, { allowManualProvider: true } );
    if ( !result.flight ) {
      return NextResponse.json( {
        error: result.providerAvailable
          ? "Flight was not found"
          : "Automatic flight details are unavailable; enter the flight number and terminal manually",
        providerAvailable: result.providerAvailable,
      }, { status: result.providerAvailable ? 404 : 503 } );
    }
    return NextResponse.json( result );
  } catch ( error ) {
    if ( error instanceof FlightProviderBudgetError ) {
      return NextResponse.json( { error: error.message }, { status: 429 } );
    }
    console.error( "Manual flight lookup failed", error );
    return NextResponse.json( { error: "The configured flight provider could not complete the lookup" }, { status: 502 } );
  }
}
