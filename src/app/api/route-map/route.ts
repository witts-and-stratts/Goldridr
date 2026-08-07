import { NextResponse } from "next/server";

const HOUSTON_CENTER = "29.7604,-95.3698";

// Every map we render sits inside the dark booking UI, so they are all tinted to
// match rather than glaring out of it in default Google colours.
const DARK_MAP_STYLE = [
  "feature:all|element:geometry|color:0x101010",
  "feature:all|element:labels.text.fill|color:0x6b6b6b",
  "feature:all|element:labels.text.stroke|color:0x0a0a0a",
  "feature:poi|element:labels|visibility:off",
  "feature:transit|visibility:off",
  "feature:administrative|element:geometry|color:0x2b2b2b",
  "feature:road|element:geometry|color:0x1c1c1c",
  "feature:road.highway|element:geometry|color:0x3a3121",
  "feature:water|element:geometry|color:0x070809",
].map( style => `&style=${ encodeURIComponent( style ) }` ).join( "" );

export async function GET( request: Request ) {
  const { searchParams } = new URL( request.url );
  const origin = searchParams.get( "origin" );
  const destination = searchParams.get( "destination" );
  const size = searchParams.get( "size" ) || "400x200";

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if ( !apiKey ) {
    return NextResponse.json(
      { error: "Google Maps API key is missing" },
      { status: 500 }
    );
  }

  // With no addresses yet the booking panel shows greater Houston instead of an
  // empty frame.
  if ( !origin || !destination ) {
    return NextResponse.json( {
      success: true,
      overview: true,
      staticMapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=${ encodeURIComponent( HOUSTON_CENTER ) }&zoom=9&size=${ size }&scale=2${ DARK_MAP_STYLE }&key=${ apiKey }`,
    } );
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
    ) }${ DARK_MAP_STYLE }&key=${ apiKey }`;

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
