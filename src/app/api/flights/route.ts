import { NextResponse } from 'next/server';

export async function GET( request: Request ) {
  const { searchParams } = new URL( request.url );
  const flightIata = searchParams.get( 'flight_iata' );

  if ( !flightIata ) {
    return NextResponse.json( { error: 'Flight IATA code is required' }, { status: 400 } );
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if ( !apiKey ) {
    return NextResponse.json( { error: 'AviationStack API key is missing' }, { status: 500 } );
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${ apiKey }&flight_iata=${ flightIata }`
    );

    if ( !response.ok ) {
      throw new Error( `AviationStack API error: ${ response.statusText }` );
    }

    const data = await response.json();
    console.log("Data", data);

    if ( data.error ) {
        return NextResponse.json({ error: data.error.info || 'API Error' }, { status: 400 });
    }

    // AviationStack returns an object with a 'data' array.
    // We want the most relevant flight (usually the first one, or filter by date/status if needed).
    // For simplicity, returning the first result or active/scheduled one.
    
    // Sort to prioritize active or scheduled flights if multiple are returned
    const flights = data.data || [];
    const relevantFlight = flights.find((f: any) => f.flight_status === 'active' || f.flight_status === 'scheduled') || flights[0];

    if (!relevantFlight) {
        return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    return NextResponse.json( relevantFlight );
  } catch ( error: any ) {
    console.error( 'Error fetching flight details:', error );
    return NextResponse.json( { error: 'Failed to fetch flight details' }, { status: 500 } );
  }
}
