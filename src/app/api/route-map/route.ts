import { NextResponse } from "next/server";

export async function GET( request: Request ) {
  const { searchParams } = new URL( request.url );
  const origin = searchParams.get( "origin" );
  const destination = searchParams.get( "destination" );
  const size = searchParams.get( "size" ) || "400x200";

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

  try {
    // Get directions to get the encoded polyline
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${ encodeURIComponent(
      origin
    ) }&destination=${ encodeURIComponent( destination ) }&key=${ apiKey }`;

    const directionsResponse = await fetch( directionsUrl );
    const directionsData = await directionsResponse.json();

    if ( directionsData.status !== "OK" || !directionsData.routes?.length ) {
      return NextResponse.json(
        { error: "Could not find route", details: directionsData.status },
        { status: 404 }
      );
    }

    // Get the overview polyline (encoded)
    const encodedPolyline = directionsData.routes[ 0 ].overview_polyline.points;

    // Build static map URL with actual route
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=${ size }&markers=color:green|label:A|${ encodeURIComponent(
      origin
    ) }&markers=color:red|label:B|${ encodeURIComponent(
      destination
    ) }&path=color:0xD4AF37|weight:4|enc:${ encodeURIComponent(
      encodedPolyline
    ) }&key=${ apiKey }`;

    return NextResponse.json( {
      success: true,
      staticMapUrl,
      encodedPolyline,
      bounds: directionsData.routes[ 0 ].bounds,
    } );
  } catch ( error: any ) {
    console.error( "Error generating route map:", error );
    return NextResponse.json(
      { error: "Failed to generate route map" },
      { status: 500 }
    );
  }
}
