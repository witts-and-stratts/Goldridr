import {
  getPaymentSettings,
  getPriceByMileAirport,
  getPriceByMileCity,
  getPriceByMileHourly,
} from "@/lib/admin-settings";

export type QuoteServiceType = "airport" | "city" | "hourly";

export interface RouteQuote {
  totalMiles: number;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
  pricePerMile: number;
  totalCents: number;
  originFormatted: string;
  destinationFormatted: string;
}

export interface BookingQuote extends Partial<RouteQuote> {
  subtotalCents: number;
  currency: "USD";
}

function mapsApiKey(): string {
  const value = process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if ( !value ) throw new Error( "Google Maps API key is missing" );
  return value;
}

async function rateFor( type: QuoteServiceType ): Promise<number> {
  if ( type === "city" ) return getPriceByMileCity();
  if ( type === "hourly" ) return getPriceByMileHourly();
  return getPriceByMileAirport();
}

export async function quoteRoute( origin: string, destination: string, type: QuoteServiceType ): Promise<RouteQuote> {
  const url = new URL( "https://maps.googleapis.com/maps/api/distancematrix/json" );
  url.searchParams.set( "origins", origin );
  url.searchParams.set( "destinations", destination );
  url.searchParams.set( "mode", "driving" );
  url.searchParams.set( "units", "imperial" );
  url.searchParams.set( "key", mapsApiKey() );

  const response = await fetch( url, { cache: "no-store" } );
  if ( !response.ok ) throw new Error( "Failed to calculate distance" );
  const data = await response.json() as {
    status?: string;
    origin_addresses?: string[];
    destination_addresses?: string[];
    rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number; text?: string }; duration?: { value?: number; text?: string } }> }>;
  };
  const element = data.rows?.[ 0 ]?.elements?.[ 0 ];
  if ( data.status !== "OK" || element?.status !== "OK" || !element.distance?.value || !element.duration?.value ) {
    throw new Error( element?.status === "ZERO_RESULTS" ? "Route not found" : "Failed to calculate distance" );
  }

  const totalMiles = Math.round( element.distance.value / 1609.344 * 10 ) / 10;
  const pricePerMile = await rateFor( type );
  return {
    totalMiles,
    durationMinutes: Math.round( element.duration.value / 60 ),
    durationText: element.duration.text || "",
    distanceText: element.distance.text || "",
    pricePerMile,
    totalCents: Math.round( totalMiles * pricePerMile * 100 ),
    originFormatted: data.origin_addresses?.[ 0 ] || origin,
    destinationFormatted: data.destination_addresses?.[ 0 ] || destination,
  };
}

export async function quoteBooking( input: { type: QuoteServiceType; pickupLocation: string; dropoffLocation?: string; hours?: number } ): Promise<BookingQuote> {
  if ( input.type === "hourly" ) {
    const hours = Number( input.hours );
    if ( !Number.isInteger( hours ) || hours < 1 || hours > 24 ) throw new Error( "A valid hourly duration is required" );
    const { hourlyRate } = await getPaymentSettings();
    return { subtotalCents: Math.round( hours * hourlyRate * 100 ), currency: "USD" };
  }
  if ( !input.dropoffLocation?.trim() ) throw new Error( "A destination is required" );
  const route = await quoteRoute( input.pickupLocation, input.dropoffLocation, input.type );
  return { ...route, subtotalCents: route.totalCents, currency: "USD" };
}
