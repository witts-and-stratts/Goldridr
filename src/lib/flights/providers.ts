import type { FlightLookupKey, FlightSnapshot } from "./types";

export interface FlightDataProvider {
  readonly id: string;
  lookup( key: FlightLookupKey ): Promise<FlightSnapshot | null>;
}

export interface ScrapingPermission {
  dataOwner: string;
  grantedAt: string;
  reference: string;
  minimumIntervalMs: number;
}

export interface PermissionedScrapeProvider extends FlightDataProvider {
  readonly permission: ScrapingPermission;
}

export function definePermissionedScrapeProvider( provider: PermissionedScrapeProvider ): PermissionedScrapeProvider {
  const permission = provider.permission;
  if ( !permission.dataOwner.trim() || !permission.reference.trim() || !Date.parse( permission.grantedAt ) ) {
    throw new Error( `Scrape provider ${ provider.id } is missing documented commercial permission` );
  }
  if ( !Number.isFinite( permission.minimumIntervalMs ) || permission.minimumIntervalMs < 1_000 ) {
    throw new Error( `Scrape provider ${ provider.id } must define a respectful request interval` );
  }
  return provider;
}

type AviationStackFlight = {
  flight_date?: string;
  flight_status?: string;
  airline?: { name?: string };
  flight?: { iata?: string };
  departure?: Record<string, unknown>;
  arrival?: Record<string, unknown>;
};

function value( input: unknown ): string | null {
  return typeof input === "string" && input.trim() ? input : null;
}

function place( input: Record<string, unknown> | undefined ) {
  return { iata: value( input?.iata ) || "UNK", name: value( input?.airport ) };
}

function snapshotFromAviationStack( key: FlightLookupKey, flight: AviationStackFlight ): FlightSnapshot {
  const departure = flight.departure;
  const arrival = flight.arrival;
  return {
    provider: "aviationstack",
    flightIata: value( flight.flight?.iata ) || key.flightIata,
    flightDate: value( flight.flight_date ) || key.flightDate,
    direction: key.direction,
    status: value( flight.flight_status ) || "scheduled",
    airline: value( flight.airline?.name ),
    origin: place( departure ),
    destination: place( arrival ),
    scheduled: { departure: value( departure?.scheduled ), arrival: value( arrival?.scheduled ) },
    estimated: { departure: value( departure?.estimated ), arrival: value( arrival?.estimated ) },
    actual: { departure: value( departure?.actual ), arrival: value( arrival?.actual ) },
    terminal: { departure: value( departure?.terminal ), arrival: value( arrival?.terminal ) },
    gate: { departure: value( departure?.gate ), arrival: value( arrival?.gate ) },
    observedAt: new Date().toISOString(),
  };
}

export function getPrimaryFlightProvider(): FlightDataProvider | null {
  return null;
}

export function getManualFlightProvider(): FlightDataProvider | null {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if ( process.env.FLIGHT_AVIATIONSTACK_ENABLED !== "true" || !apiKey ) return null;
  return {
    id: "aviationstack",
    async lookup( key ) {
      const url = new URL( "https://api.aviationstack.com/v1/flights" );
      url.searchParams.set( "access_key", apiKey );
      url.searchParams.set( "flight_iata", key.flightIata );
      url.searchParams.set( "flight_date", key.flightDate );
      url.searchParams.set( "limit", "10" );
      const response = await fetch( url, { cache: "no-store", signal: AbortSignal.timeout( 10_000 ) } );
      if ( !response.ok ) throw new Error( `Aviationstack returned ${ response.status }` );
      const body = await response.json() as { data?: AviationStackFlight[]; error?: { info?: string } };
      if ( body.error ) throw new Error( body.error.info || "Aviationstack request failed" );
      const flights = body.data || [];
      const flight = flights.find( item => item.flight_date === key.flightDate ) || flights[ 0 ];
      return flight ? snapshotFromAviationStack( key, flight ) : null;
    },
  };
}
