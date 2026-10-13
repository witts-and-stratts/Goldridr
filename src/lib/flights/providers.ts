import { isHoustonAirport } from "@/lib/airports";
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

// Raised when the provider plan cannot filter by date and the unfiltered (live) feed
// has no flight on the requested day, which is always the case for future dates.
export class FlightDateUnavailableError extends Error {
  constructor( readonly flightDate: string ) {
    super( `Flight data for ${ flightDate } is not available from the current flight data plan` );
    this.name = "FlightDateUnavailableError";
  }
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
      let dateFilterRestricted = false;
      try {
        flights = await requestAviationStack( url );
      } catch ( error ) {
        if ( !key.flightDate || !isDateFilterError( error ) ) throw error;
        if ( dateFilter ) url.searchParams.delete( dateFilter );
        dateFilterRestricted = true;
        flights = await requestAviationStack( url );
      }
      const flight = selectFlight( key, flights );
      if ( !flight && dateFilterRestricted && key.flightDate ) throw new FlightDateUnavailableError( key.flightDate );
      return flight ? snapshotFromAviationStack( key, flight ) : null;
    },
  };
}

type AeroDataBoxTime = { utc?: string | null; local?: string | null };

type AeroDataBoxMovement = {
  airport?: { iata?: string | null; icao?: string | null; name?: string | null; shortName?: string | null } | null;
  scheduledTime?: AeroDataBoxTime | null;
  revisedTime?: AeroDataBoxTime | null;
  predictedTime?: AeroDataBoxTime | null;
  runwayTime?: AeroDataBoxTime | null;
  terminal?: string | null;
  gate?: string | null;
};

type AeroDataBoxFlight = {
  number?: string;
  status?: string;
  codeshareStatus?: string;
  isCargo?: boolean;
  airline?: { name?: string | null; iata?: string | null } | null;
  departure?: AeroDataBoxMovement | null;
  arrival?: AeroDataBoxMovement | null;
};

const AERODATABOX_DEFAULT_HOST = "aerodatabox.p.rapidapi.com";

// AeroDataBox times look like "2026-10-23 14:05Z"; the space is not valid ISO 8601 everywhere.
function aeroDataBoxInstant( time: AeroDataBoxTime | null | undefined ): string | null {
  const utc = value( time?.utc );
  if ( !utc ) return null;
  const iso = utc.replace( " ", "T" );
  return Number.isFinite( Date.parse( iso ) ) ? iso : null;
}

function aeroDataBoxLocalDate( time: AeroDataBoxTime | null | undefined ): string | null {
  const local = value( time?.local );
  return local && /^\d{4}-\d{2}-\d{2}/.test( local ) ? local.slice( 0, 10 ) : null;
}

// Mapped onto the vocabulary the rest of the app already uses (Aviationstack's).
function aeroDataBoxStatus( status: string | undefined ): string {
  switch ( status ) {
    case "Arrived": return "landed";
    case "Canceled":
    case "CanceledUncertain": return "cancelled";
    case "Diverted": return "diverted";
    case "Departed":
    case "EnRoute":
    case "Approaching": return "active";
    case "Delayed": return "delayed";
    default: return "scheduled";
  }
}

function aeroDataBoxPlace( movement: AeroDataBoxMovement | null | undefined ) {
  const airport = movement?.airport;
  return { iata: value( airport?.iata ) || "UNK", name: value( airport?.name ) || value( airport?.shortName ) };
}

function houstonSide( key: FlightLookupKey, flight: AeroDataBoxFlight ): boolean {
  const departure = flight.departure?.airport?.iata;
  const arrival = flight.arrival?.airport?.iata;
  if ( key.direction === "from_airport" ) return isHoustonAirport( arrival );
  if ( key.direction === "to_airport" ) return isHoustonAirport( departure );
  return isHoustonAirport( arrival ) || isHoustonAirport( departure );
}

// A flight number can return several legs or codeshare duplicates; prefer the
// passenger leg that touches Houston on the requested side, operated by the carrier itself.
function selectAeroDataBoxFlight( key: FlightLookupKey, flights: AeroDataBoxFlight[] ): AeroDataBoxFlight | undefined {
  const passenger = flights.filter( flight => !flight.isCargo );
  const candidates = passenger.length ? passenger : flights;
  const score = ( flight: AeroDataBoxFlight ) =>
    ( houstonSide( key, flight ) ? 2 : 0 ) + ( flight.codeshareStatus === "IsCodeshared" ? 0 : 1 );
  return candidates.reduce<AeroDataBoxFlight | undefined>( ( best, flight ) => ( !best || score( flight ) > score( best ) ? flight : best ), undefined );
}

function snapshotFromAeroDataBox( key: FlightLookupKey, flight: AeroDataBoxFlight ): FlightSnapshot {
  const departure = flight.departure;
  const arrival = flight.arrival;
  const direction = key.direction || ( isHoustonAirport( arrival?.airport?.iata ) ? "from_airport" : "to_airport" );
  const sideTime = direction === "from_airport" ? arrival?.scheduledTime : departure?.scheduledTime;
  return {
    provider: "aerodatabox",
    flightIata: value( flight.number )?.replaceAll( " ", "" ).toUpperCase() || key.flightIata,
    flightDate: key.flightDate || aeroDataBoxLocalDate( sideTime ) || new Date().toISOString().slice( 0, 10 ),
    direction,
    status: aeroDataBoxStatus( flight.status ),
    airline: value( flight.airline?.name ),
    origin: aeroDataBoxPlace( departure ),
    destination: aeroDataBoxPlace( arrival ),
    scheduled: { departure: aeroDataBoxInstant( departure?.scheduledTime ), arrival: aeroDataBoxInstant( arrival?.scheduledTime ) },
    estimated: {
      departure: aeroDataBoxInstant( departure?.revisedTime ) || aeroDataBoxInstant( departure?.predictedTime ),
      arrival: aeroDataBoxInstant( arrival?.revisedTime ) || aeroDataBoxInstant( arrival?.predictedTime ),
    },
    actual: { departure: aeroDataBoxInstant( departure?.runwayTime ), arrival: aeroDataBoxInstant( arrival?.runwayTime ) },
    terminal: { departure: value( departure?.terminal ), arrival: value( arrival?.terminal ) },
    gate: { departure: value( departure?.gate ), arrival: value( arrival?.gate ) },
    observedAt: new Date().toISOString(),
  };
}

function getAeroDataBoxProvider(): FlightDataProvider | null {
  const apiKey = process.env.AERODATABOX_RAPIDAPI_KEY?.trim();
  if ( !apiKey ) return null;
  const host = process.env.AERODATABOX_RAPIDAPI_HOST?.trim() || AERODATABOX_DEFAULT_HOST;
  return {
    id: "aerodatabox",
    async lookup( key ) {
      const path = key.flightDate
        ? `/flights/number/${ encodeURIComponent( key.flightIata ) }/${ key.flightDate }`
        : `/flights/number/${ encodeURIComponent( key.flightIata ) }`;
      const url = new URL( path, `https://${ host }` );
      if ( key.flightDate ) {
        url.searchParams.set( "dateLocalRole", key.direction === "from_airport" ? "Arrival" : key.direction === "to_airport" ? "Departure" : "Both" );
      }
      url.searchParams.set( "withAircraftImage", "false" );
      url.searchParams.set( "withLocation", "false" );
      const response = await fetch( url, {
        cache: "no-store",
        signal: AbortSignal.timeout( 10_000 ),
        headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": host },
      } );
      // 204 is how AeroDataBox says the flight does not operate on that date. Anything
      // else that is not OK (including a 404 from a mistyped host) is a configuration or
      // quota problem and must not be reported to the guest as a missing flight.
      if ( response.status === 204 ) return null;
      const body = await response.json().catch( () => null ) as AeroDataBoxFlight[] | { message?: string } | null;
      if ( !response.ok ) {
        const message = body && !Array.isArray( body ) && body.message ? body.message : `AeroDataBox returned ${ response.status }`;
        throw new Error( message );
      }
      const flight = Array.isArray( body ) ? selectAeroDataBoxFlight( key, body ) : undefined;
      return flight ? snapshotFromAeroDataBox( key, flight ) : null;
    },
  };
}

export function getPrimaryFlightProvider(): FlightDataProvider | null {
  const provider = process.env.FLIGHT_PRIMARY_PROVIDER?.trim().toLowerCase();
  if ( provider === "aerodatabox" ) return getAeroDataBoxProvider();
  if ( provider === "aviationstack" ) return getAviationStackProvider();
  if ( provider ) return null;
  return getAeroDataBoxProvider() ?? getAviationStackProvider();
}

export function getManualFlightProvider(): FlightDataProvider | null {
  if ( process.env.FLIGHT_AVIATIONSTACK_ENABLED !== "true" ) return null;
  return getAviationStackProvider();
}
