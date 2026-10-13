import {
  checkBlockedClash,
  checkBookingClash,
  findAvailableChauffeur,
} from "@/lib/pocketbase/repository";
import { getNotificationTimeZone } from "@/lib/admin-settings";
import { isBookingTimeInFuture } from "@/lib/booking-time";
import { zonedDateTimeToDate } from "@/lib/notifications/time";

export interface AlternativeSlot {
  date: string;
  time: string;
}

const MAX_ALTERNATIVES = 4;

export async function formatTimeInZone( date: Date ): Promise<string> {
  return new Intl.DateTimeFormat( "en-GB", {
    timeZone: await getNotificationTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  } ).format( date );
}

function shiftDateString( date: string, days: number ): string {
  const base = new Date( `${ date }T12:00:00` );
  base.setDate( base.getDate() + days );
  const year = base.getFullYear();
  const month = String( base.getMonth() + 1 ).padStart( 2, "0" );
  const day = String( base.getDate() ).padStart( 2, "0" );
  return `${ year }-${ month }-${ day }`;
}

async function isSlotFree( date: string, time: string, durationMinutes: number, chauffeurId?: string | null ): Promise<boolean> {
  if ( !isBookingTimeInFuture( date, time, new Date(), await getNotificationTimeZone() ) ) {
    return false;
  }

  if ( chauffeurId !== undefined && chauffeurId !== null ) {
    const bookingClash = await checkBookingClash( date, time, durationMinutes, chauffeurId );
    const blockedClash = await checkBlockedClash( date, time, durationMinutes, chauffeurId );
    return !( bookingClash.clash || blockedClash.clash );
  }
  return !!await findAvailableChauffeur( date, time, durationMinutes );
}

export async function getAlternativeSlots( date: string, time: string, durationMinutes: number, chauffeurId?: string | null ): Promise<AlternativeSlot[]> {
  const alternatives: AlternativeSlot[] = [];
  const timeZone = await getNotificationTimeZone();
  const requestedDate = zonedDateTimeToDate( date, time, timeZone );

  if ( Number.isNaN( requestedDate.getTime() ) ) return alternatives;

  // Nearby times on the requested day.
  const offsets = [ -30, -60, -90, -120, 30, 60, 90, 120, 150, 180, 210, 240 ];

  for ( const offset of offsets ) {
    const testDate = new Date( requestedDate.getTime() + offset * 60 * 1000 );
    const testTime = await formatTimeInZone( testDate );
    if ( await isSlotFree( date, testTime, durationMinutes, chauffeurId ) ) {
      alternatives.push( { date, time: testTime } );
      if ( alternatives.length >= MAX_ALTERNATIVES ) return alternatives;
    }
  }

  // Same time on the following days.
  for ( let dayOffset = 1; dayOffset <= 3; dayOffset++ ) {
    const testDate = shiftDateString( date, dayOffset );
    if ( await isSlotFree( testDate, time, durationMinutes, chauffeurId ) ) {
      alternatives.push( { date: testDate, time } );
      if ( alternatives.length >= MAX_ALTERNATIVES ) return alternatives;
    }
  }

  return alternatives;
}

export async function checkSlotAvailability(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: string | null
): Promise<{
  available: boolean;
  alternativeSlots: AlternativeSlot[];
  bookingClash: Awaited<ReturnType<typeof checkBookingClash>>;
  blockedClash: Awaited<ReturnType<typeof checkBlockedClash>>;
}> {
  const bookingClash = await checkBookingClash( date, time, durationMinutes, chauffeurId );
  const blockedClash = await checkBlockedClash( date, time, durationMinutes, chauffeurId );
  const available = chauffeurId !== undefined && chauffeurId !== null
    ? !( bookingClash.clash || blockedClash.clash )
    : !!await findAvailableChauffeur( date, time, durationMinutes );

  return {
    available,
    alternativeSlots: available ? [] : await getAlternativeSlots( date, time, durationMinutes, chauffeurId ),
    bookingClash,
    blockedClash,
  };
}
