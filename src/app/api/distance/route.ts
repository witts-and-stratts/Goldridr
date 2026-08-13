import { NextResponse } from "next/server";
import { quoteRoute, type QuoteServiceType } from "@/lib/payments/quote";

export async function GET( request: Request ) {
  const { searchParams } = new URL( request.url );
  const origin = searchParams.get( "origin" );
  const destination = searchParams.get( "destination" );
  const value = searchParams.get( "type" ) || "airport";
  const type: QuoteServiceType = value === "city" || value === "hourly" ? value : "airport";

  if ( !origin || !destination ) {
    return NextResponse.json(
      { error: "Origin and destination are required" },
      { status: 400 }
    );
  }

  try {
    const quote = await quoteRoute( origin, destination, type );

    return NextResponse.json( {
      success: true,
      total_miles: quote.totalMiles,
      duration_minutes: quote.durationMinutes,
      duration_text: quote.durationText,
      distance_text: quote.distanceText,
      price_per_mile: quote.pricePerMile,
      total_price: quote.totalCents / 100,
      origin_formatted: quote.originFormatted,
      destination_formatted: quote.destinationFormatted,
      booking_type: type,
    } );
  } catch ( error: unknown ) {
    console.error( "Error calculating distance:", error );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate distance" },
      { status: error instanceof Error && error.message === "Route not found" ? 404 : 500 }
    );
  }
}
