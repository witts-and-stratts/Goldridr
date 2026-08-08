import { isTerminalFlightStatus, type FlightSnapshot } from "./types";

export const FLIGHT_FIVE_MINUTES = 5 * 60_000;
export const FLIGHT_FIFTEEN_MINUTES = 15 * 60_000;
export const FLIGHT_TWO_HOURS = 2 * 60 * 60_000;
export const FLIGHT_SIX_HOURS = 6 * 60 * 60_000;

export function getNextFlightCheck( target: number, snapshot: FlightSnapshot | null, now = Date.now() ): { active: boolean; at: string } {
  if ( snapshot && isTerminalFlightStatus( snapshot.status ) ) return { active: false, at: new Date( now ).toISOString() };
  if ( now > target + FLIGHT_TWO_HOURS ) return { active: false, at: new Date( now ).toISOString() };
  if ( now < target - FLIGHT_SIX_HOURS ) return { active: true, at: new Date( target - FLIGHT_SIX_HOURS ).toISOString() };
  const interval = now >= target - FLIGHT_TWO_HOURS ? FLIGHT_FIVE_MINUTES : FLIGHT_FIFTEEN_MINUTES;
  return { active: true, at: new Date( now + interval ).toISOString() };
}

function changedValue( before: string | null, after: string | null ): boolean {
  return Boolean( before && after && before !== after );
}

export function getFlightAlertChanges( before: FlightSnapshot | null, after: FlightSnapshot ): string[] {
  if ( !before ) return [];
  const changes: string[] = [];
  const status = after.status.toLowerCase();
  if ( [ "cancelled", "diverted" ].includes( status ) && before.status.toLowerCase() !== status ) changes.push( `status changed to ${ status }` );
  const side = after.direction === "from_airport" ? "arrival" : "departure";
  if ( changedValue( before.terminal[ side ], after.terminal[ side ] ) ) changes.push( `${ side } terminal changed to ${ after.terminal[ side ] }` );
  if ( changedValue( before.gate[ side ], after.gate[ side ] ) ) changes.push( `${ side } gate changed to ${ after.gate[ side ] }` );
  const beforeArrival = Date.parse( before.estimated.arrival || before.scheduled.arrival || "" );
  const afterArrival = Date.parse( after.estimated.arrival || after.scheduled.arrival || "" );
  if ( Number.isFinite( beforeArrival ) && Number.isFinite( afterArrival ) && Math.abs( afterArrival - beforeArrival ) >= FLIGHT_FIFTEEN_MINUTES ) {
    changes.push( `arrival shifted by ${ Math.round( ( afterArrival - beforeArrival ) / 60_000 ) } minutes` );
  }
  return changes;
}
