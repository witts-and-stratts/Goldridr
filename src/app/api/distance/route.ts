import { NextResponse } from "next/server";

export async function GET( request: Request ) {
  const { searchParams } = new URL( request.url );
  const origin = searchParams.get( "origin" );
  const destination = searchParams.get( "destination" );
  const type = searchParams.get( "type" ) || "airport"; // airport, hourly, city

  if ( !origin || !destination ) {
    return NextResponse.json(
      { error: "Origin and destination are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if ( !apiKey ) {
    return NextResponse.json(
      { error: "Google Maps API key is missing" },
      { status: 500 }
    );
  }

  // Get price per mile based on booking type
  const pricePerMileMap: Record<string, string | undefined> = {
    airport: process.env.PRICE_BY_MILE_AIRPORT,
    hourly: process.env.PRICE_BY_MILE_HOURLY,
    city: process.env.PRICE_BY_MILE_CITY,
  };

  const pricePerMile = parseFloat( pricePerMileMap[ type ] || "3.50" );

  try {
    // Call Google Maps Distance Matrix API
    const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${ encodeURIComponent(
      origin
    ) }&destinations=${ encodeURIComponent(
      destination
    ) }&mode=driving&units=imperial&key=${ apiKey }`;

    const response = await fetch( distanceMatrixUrl );
    const data = await response.json();

    if ( data.status !== "OK" ) {
      return NextResponse.json(
        { error: "Failed to calculate distance", details: data.status },
        { status: 400 }
      );
    }

    const element = data.rows[ 0 ]?.elements[ 0 ];

    if ( !element || element.status !== "OK" ) {
      return NextResponse.json(
        { error: "Route not found", details: element?.status },
        { status: 404 }
      );
    }

    // Extract distance in miles (API returns meters, convert to miles)
    const distanceMeters = element.distance.value;
    const totalMiles = Math.round( ( distanceMeters / 1609.344 ) * 10 ) / 10;

    // Extract duration in minutes
    const durationSeconds = element.duration.value;
    const durationMinutes = Math.round( durationSeconds / 60 );

    // Calculate total price
    const totalPrice = Math.round( totalMiles * pricePerMile * 100 ) / 100;

    return NextResponse.json( {
      success: true,
      total_miles: totalMiles,
      duration_minutes: durationMinutes,
      duration_text: element.duration.text,
      distance_text: element.distance.text,
      price_per_mile: pricePerMile,
      total_price: totalPrice,
      origin_formatted: data.origin_addresses[ 0 ],
      destination_formatted: data.destination_addresses[ 0 ],
      booking_type: type,
    } );
  } catch ( error: any ) {
    console.error( "Error calculating distance:", error );
    return NextResponse.json(
      { error: "Failed to calculate distance" },
      { status: 500 }
    );
  }
}
