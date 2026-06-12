import { formatRideTime } from "@/lib/format";
import type { BlockedSlot, DriverRide } from "@/lib/types";

export function dateKey( d: Date ): string {
  const m = String( d.getMonth() + 1 ).padStart( 2, "0" );
  const day = String( d.getDate() ).padStart( 2, "0" );
  return `${ d.getFullYear() }-${ m }-${ day }`;
}

export interface MonthCell {
  key: string;
  day: number;
  inMonth: boolean;
}

// 6 fixed weeks starting Sunday, like the admin calendar's month view.
export function monthGrid( year: number, month: number ): MonthCell[] {
  const first = new Date( year, month, 1 );
  const start = new Date( year, month, 1 - first.getDay() );
  const cells: MonthCell[] = [];
  for ( let i = 0; i < 42; i++ ) {
    const d = new Date( start.getFullYear(), start.getMonth(), start.getDate() + i );
    cells.push( {
      key: dateKey( d ),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    } );
  }
  return cells;
}

export function monthTitle( year: number, month: number ): string {
  return new Date( year, month, 1 ).toLocaleDateString( "en-US", {
    month: "long",
    year: "numeric",
  } );
}

export function parseKey( key: string ): Date {
  return new Date( `${ key }T00:00:00` );
}

export function addDaysKey( key: string, delta: number ): string {
  const d = parseKey( key );
  d.setDate( d.getDate() + delta );
  return dateKey( d );
}

/** The 7 date keys of the week containing `key`, starting Sunday. */
export function weekDays( key: string ): string[] {
  const d = parseKey( key );
  const start = addDaysKey( key, -d.getDay() );
  return Array.from( { length: 7 }, ( _, i ) => addDaysKey( start, i ) );
}

export function weekTitle( key: string ): string {
  const days = weekDays( key );
  const start = parseKey( days[ 0 ] );
  const end = parseKey( days[ 6 ] );
  const startLabel = start.toLocaleDateString( "en-US", { month: "short", day: "numeric" } );
  const endLabel = end.toLocaleDateString(
    "en-US",
    start.getMonth() === end.getMonth()
      ? { day: "numeric" }
      : { month: "short", day: "numeric" }
  );
  return `${ startLabel } to ${ endLabel }, ${ end.getFullYear() }`;
}

// Mirrors getBlockoutsForDate in src/components/calendar/utils.ts on the web.
export function blocksForDate( blocks: BlockedSlot[], dateStr: string ): BlockedSlot[] {
  const dow = new Date( `${ dateStr }T00:00:00` ).getDay();
  return blocks.filter( ( b ) => {
    if ( b.recurring === "none" || b.recurring == null ) {
      if ( b.endDate ) return dateStr >= b.date && dateStr <= b.endDate;
      return b.date === dateStr;
    }
    if ( b.recurring === "daily" ) return true;
    if ( b.recurring === "weekly" ) return new Date( `${ b.date }T00:00:00` ).getDay() === dow;
    if ( b.recurring === "weekends" ) return dow === 0 || dow === 6;
    return false;
  } );
}

export function ridesForDate( rides: DriverRide[], dateStr: string ): DriverRide[] {
  return rides.filter( ( r ) => r.date === dateStr );
}

export function blockTimeLabel( block: BlockedSlot ): string {
  if ( block.isFullDay ) return "All day";
  const [ h = 0, m = 0 ] = block.time.split( ":" ).map( Number );
  const endMinutes = h * 60 + m + block.duration;
  const endH = Math.floor( endMinutes / 60 ) % 24;
  const endM = endMinutes % 60;
  const end = `${ String( endH ).padStart( 2, "0" ) }:${ String( endM ).padStart( 2, "0" ) }`;
  return `${ formatRideTime( block.time ) } to ${ formatRideTime( end ) }`;
}

export function recurringLabel( recurring: string ): string | null {
  if ( recurring === "daily" ) return "Every day";
  if ( recurring === "weekly" ) return "Weekly";
  if ( recurring === "weekends" ) return "Weekends";
  return null;
}
