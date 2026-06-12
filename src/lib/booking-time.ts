import { zonedDateTimeToDate } from "@/lib/notifications/time";

export const DEFAULT_BOOKING_TIME_ZONE = "America/Chicago";

export class PastBookingTimeError extends Error {
  constructor() {
    super( "Pickup date and time must be in the future" );
    this.name = "PastBookingTimeError";
  }
}

export function getBookingTimeZone(): string {
  return process.env.NOTIFICATION_TIMEZONE || DEFAULT_BOOKING_TIME_ZONE;
}

export function getDateStringInTimeZone(
  now = new Date(),
  timeZone = getBookingTimeZone()
): string {
  const parts = new Intl.DateTimeFormat( "en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  } ).formatToParts( now );
  const values = Object.fromEntries(
    parts.filter( part => part.type !== "literal" ).map( part => [ part.type, part.value ] )
  );
  return `${ values.year }-${ values.month }-${ values.day }`;
}

export function getMinimumBookingDate(
  now = new Date(),
  timeZone = DEFAULT_BOOKING_TIME_ZONE
): Date {
  const [ year, month, day ] = getDateStringInTimeZone( now, timeZone ).split( "-" ).map( Number );
  return new Date( year, month - 1, day );
}

export function isBookingTimeInFuture(
  date: string,
  time: string,
  now = new Date(),
  timeZone = getBookingTimeZone()
): boolean {
  const pickup = zonedDateTimeToDate( date, time, timeZone );
  return Number.isFinite( pickup.getTime() ) && pickup.getTime() > now.getTime();
}

export function assertFutureBookingTime(
  date: string,
  time: string,
  now = new Date(),
  timeZone = getBookingTimeZone()
): void {
  if ( !isBookingTimeInFuture( date, time, now, timeZone ) ) {
    throw new PastBookingTimeError();
  }
}
