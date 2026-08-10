export type FlightDirection = "to_airport" | "from_airport";

export interface FlightLookupKey {
  flightIata: string;
  flightDate: string | null;
  direction: FlightDirection | null;
}

export interface FlightPlace {
  iata: string;
  name: string | null;
}

export interface FlightSnapshot {
  provider: string;
  flightIata: string;
  flightDate: string;
  direction: FlightDirection;
  status: string;
  airline: string | null;
  origin: FlightPlace;
  destination: FlightPlace;
  scheduled: { departure: string | null; arrival: string | null };
  estimated: { departure: string | null; arrival: string | null };
  actual: { departure: string | null; arrival: string | null };
  terminal: { departure: string | null; arrival: string | null };
  gate: { departure: string | null; arrival: string | null };
  observedAt: string;
}

const FLIGHT_IATA_PATTERN = /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeFlightLookupKey( input: Record<string, unknown> ): FlightLookupKey | null {
  const flightIata = String( input.flightIata ?? input.flight_iata ?? "" ).replaceAll( " ", "" ).toUpperCase();
  const flightDate = String( input.flightDate ?? input.flight_date ?? "" );
  const direction = String( input.direction ?? "" );
  if ( !FLIGHT_IATA_PATTERN.test( flightIata ) ) return null;
  if ( flightDate ) {
    if ( !DATE_PATTERN.test( flightDate ) ) return null;
    const parsedDate = new Date( `${ flightDate }T00:00:00Z` );
    if ( Number.isNaN( parsedDate.getTime() ) || parsedDate.toISOString().slice( 0, 10 ) !== flightDate ) return null;
  }
  if ( direction && direction !== "to_airport" && direction !== "from_airport" ) return null;
  return {
    flightIata,
    flightDate: flightDate || null,
    direction: direction === "to_airport" || direction === "from_airport" ? direction : null,
  };
}

export function flightLookupId( key: FlightLookupKey ): string {
  return `${ key.flightIata }:${ key.flightDate || "*" }:${ key.direction || "*" }`;
}

export function relevantFlightTime( snapshot: FlightSnapshot ): string | null {
  const side = snapshot.direction === "from_airport" ? "arrival" : "departure";
  return snapshot.actual[ side ] || snapshot.estimated[ side ] || snapshot.scheduled[ side ];
}

export function isTerminalFlightStatus( status: string ): boolean {
  return [ "landed", "cancelled", "diverted", "incident" ].includes( status.toLowerCase() );
}
