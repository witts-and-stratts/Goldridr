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

type AviationStackResponse = {
  data?: AviationStackFlight[];
  error?: {
    code?: string;
    message?: string;
    info?: string;
    context?: Record<string, unknown>;
  };
};

type AviationStackRequestError = Error & {
  code?: string;
  context?: Record<string, unknown>;
};

function value( input: unknown ): string | null {
  return typeof input === "string" && input.trim() ? input : null;
}

function place( input: Record<string, unknown> | undefined ) {
  return { iata: value( input?.iata ) || "UNK", name: value( input?.airport ) };
}

function flightTime( flight: AviationStackFlight ): number {
  const departure = flight.departure;
  const arrival = flight.arrival;
  for ( const candidate of [ departure?.actual, departure?.estimated, departure?.scheduled, arrival?.actual, arrival?.estimated, arrival?.scheduled ] ) {
    const parsed = Date.parse( value( candidate ) || "" );
    if ( Number.isFinite( parsed ) ) return parsed;
  }
  return Number.NaN;
}

function scheduledDate( input: Record<string, unknown> | undefined ): string | null {
  const scheduled = value( input?.scheduled );
  return scheduled && /^\d{4}-\d{2}-\d{2}/.test( scheduled ) ? scheduled.slice( 0, 10 ) : null;
}

function flightDateForDirection( key: FlightLookupKey, flight: AviationStackFlight ): string | null {
  if ( key.direction === "from_airport" ) return scheduledDate( flight.arrival ) || value( flight.flight_date );
  if ( key.direction === "to_airport" ) return scheduledDate( flight.departure ) || value( flight.flight_date );
  return value( flight.flight_date );
}

function selectFlight( key: FlightLookupKey, flights: AviationStackFlight[] ): AviationStackFlight | undefined {
  if ( key.flightDate ) {
    return flights.find( item => flightDateForDirection( key, item ) === key.flightDate );
  }
  const now = Date.now();
  return flights.reduce<AviationStackFlight | undefined>( ( closest, flight ) => {
    if ( !closest ) return flight;
    const time = flightTime( flight );
    const closestTime = flightTime( closest );
    if ( !Number.isFinite( time ) ) return closest;
    if ( !Number.isFinite( closestTime ) ) return flight;
    return Math.abs( time - now ) < Math.abs( closestTime - now ) ? flight : closest;
  }, undefined );
}

async function requestAviationStack( url: URL ): Promise<AviationStackFlight[]> {
  const response = await fetch( url, { cache: "no-store", signal: AbortSignal.timeout( 10_000 ) } );
  const body = await response.json().catch( () => null ) as AviationStackResponse | null;
  if ( !response.ok || body?.error ) {
    const providerError = body?.error;
    const error = new Error(
      providerError?.message || providerError?.info || `Aviationstack returned ${ response.status }`,
    ) as AviationStackRequestError;
    error.code = providerError?.code;
    error.context = providerError?.context;
    throw error;
  }
  return body?.data || [];
}

function isDateFilterError( error: unknown ): boolean {
  const providerError = error as AviationStackRequestError;
  return providerError.code === "function_access_restricted"
    || ( providerError.code === "validation_error" && Boolean(
      providerError.context?.flight_date
      || providerError.context?.arr_scheduled_time_arr
      || providerError.context?.dep_scheduled_time_dep,
    ) );
}

function setDateFilter( url: URL, key: FlightLookupKey ): string | null {
  if ( !key.flightDate ) return null;
  const parameter = key.direction === "from_airport"
    ? "arr_scheduled_time_arr"
    : key.direction === "to_airport"
      ? "dep_scheduled_time_dep"
      : "flight_date";
  url.searchParams.set( parameter, key.flightDate );
  return parameter;
}

function snapshotFromAviationStack( key: FlightLookupKey, flight: AviationStackFlight ): FlightSnapshot {
  const departure = flight.departure;
  const arrival = flight.arrival;
  return {
    provider: "aviationstack",
    flightIata: value( flight.flight?.iata ) || key.flightIata,
    flightDate: value( flight.flight_date ) || key.flightDate || new Date().toISOString().slice( 0, 10 ),
    direction: key.direction || "from_airport",
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

function getAviationStackProvider(): FlightDataProvider | null {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if ( !apiKey ) return null;
  return {
    id: "aviationstack",
    async lookup( key ) {
      const url = new URL( "https://api.aviationstack.com/v1/flights" );
      url.searchParams.set( "access_key", apiKey );
      url.searchParams.set( "flight_iata", key.flightIata );
      const dateFilter = setDateFilter( url, key );
      url.searchParams.set( "limit", "10" );
      let flights: AviationStackFlight[];
      try {
        flights = await requestAviationStack( url );
      } catch ( error ) {
        if ( !key.flightDate || !isDateFilterError( error ) ) throw error;
        if ( dateFilter ) url.searchParams.delete( dateFilter );
        flights = await requestAviationStack( url );
      }
      const flight = selectFlight( key, flights );
      return flight ? snapshotFromAviationStack( key, flight ) : null;
    },
  };
}

export function getPrimaryFlightProvider(): FlightDataProvider | null {
  const provider = process.env.FLIGHT_PRIMARY_PROVIDER?.trim().toLowerCase() || "aviationstack";
  return provider === "aviationstack" ? getAviationStackProvider() : null;
}

export function getManualFlightProvider(): FlightDataProvider | null {
  if ( process.env.FLIGHT_AVIATIONSTACK_ENABLED !== "true" ) return null;
  return getAviationStackProvider();
}
