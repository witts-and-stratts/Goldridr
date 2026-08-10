import type { FailedDelivery, Folder, NotificationItem, ReminderDelivery, StatusVariant } from "./types";

export function relativeTime( value: string ) {
  const date = new Date( value );
  if ( Number.isNaN( date.getTime() ) ) return "Unknown date";
  const delta = Date.now() - date.getTime();
  if ( delta < 60_000 ) return "Now";
  if ( delta < 3_600_000 ) return `${ Math.floor( delta / 60_000 ) }m`;
  if ( delta < 86_400_000 ) return `${ Math.floor( delta / 3_600_000 ) }h`;
  return date.toLocaleDateString( "en-US", { month: "short", day: "numeric" } );
}

export function formatDateTime( value: string ) {
  const date = new Date( value );
  return Number.isNaN( date.getTime() ) ? "Unknown date" : date.toLocaleString();
}

export function statusVariant( status: string ): StatusVariant {
  if ( status === "delivered" ) return "default";
  if ( status === "failed" || status === "dead_letter" || status === "undelivered" ) return "destructive";
  return "outline";
}

export function filterNotifications( {
  folder,
  items,
  search,
  unreadOnly,
}: {
  folder: Folder;
  items: NotificationItem[];
  search: string;
  unreadOnly: boolean;
} ) {
  let result: NotificationItem[] = [];
  if ( folder === "inbox" ) result = items;
  if ( folder === "unread" ) result = items.filter( item => !item.readAt );
  if ( [ "bookings", "messages", "system" ].includes( folder ) ) {
    result = items.filter( item => item.category === folder );
  }
  if ( unreadOnly ) result = result.filter( item => !item.readAt );

  const query = search.trim().toLowerCase();
  if ( !query ) return result;
  return result.filter( item =>
    item.title.toLowerCase().includes( query )
    || item.body.toLowerCase().includes( query )
    || item.bookingReference?.toLowerCase().includes( query )
  );
}

export function filterReminders( reminders: ReminderDelivery[], search: string ) {
  const query = search.trim().toLowerCase();
  if ( !query ) return reminders;
  return reminders.filter( reminder =>
    reminder.passengerName?.toLowerCase().includes( query )
    || reminder.recipient.toLowerCase().includes( query )
    || reminder.bookingReference?.toLowerCase().includes( query )
  );
}

export function filterFailures( failed: FailedDelivery[], search: string ) {
  const query = search.trim().toLowerCase();
  if ( !query ) return failed;
  return failed.filter( delivery =>
    delivery.title.toLowerCase().includes( query )
    || delivery.recipient.toLowerCase().includes( query )
    || delivery.bookingReference?.toLowerCase().includes( query )
  );
}

export function humanizeKey( key: string ): string {
  return key
    .replace( /[_-]+/g, " " )
    .replace( /([a-z0-9])([A-Z])/g, "$1 $2" )
    .replace( /^\w/, match => match.toUpperCase() );
}

export function parseNestedJson( value: string ): { parsed: boolean; value: unknown } {
  const trimmed = value.trim();
  if ( !trimmed.startsWith( "{" ) && !trimmed.startsWith( "[" ) ) return { parsed: false, value };
  try {
    return { parsed: true, value: JSON.parse( trimmed ) as unknown };
  } catch {
    return { parsed: false, value };
  }
}

export function isRecord( value: unknown ): value is Record<string, unknown> {
  return Boolean( value ) && typeof value === "object" && !Array.isArray( value );
}

export function getString( value: unknown ): string {
  if ( value === null || value === undefined || value === "" ) return "";
  if ( typeof value === "string" ) return value;
  if ( typeof value === "number" || typeof value === "boolean" ) return String( value );
  return "";
}
