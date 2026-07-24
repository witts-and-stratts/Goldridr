import type { MessageThread, NotificationItem } from "../types";
import { getString, isRecord, parseNestedJson } from "../utils";

function metadataOf( item: NotificationItem ): Record<string, unknown> | null {
  const { value } = parseNestedJson( item.metadata );
  return isRecord( value ) ? value : null;
}

function isThreadable( item: NotificationItem ): boolean {
  return item.category === "messages" || item.category === "reminders";
}

function isInbound( item: NotificationItem ): boolean {
  const metadata = metadataOf( item );
  return metadata?.direction === "inbound";
}

export function riderKeyFor( item: NotificationItem ): string | null {
  if ( !isThreadable( item ) ) return null;
  const metadata = metadataOf( item );
  if ( !metadata ) return item.bookingReference ? `booking:${ item.bookingReference }` : null;
  if ( Array.isArray( metadata.chauffeurIds ) ) return null;

  const email = getString( metadata.passengerEmail ).trim().toLowerCase();
  if ( email ) return email;
  if ( item.bookingReference ) return `booking:${ item.bookingReference }`;
  return null;
}

export function isBroadcast( item: NotificationItem ): boolean {
  if ( item.category !== "messages" ) return false;
  const metadata = metadataOf( item );
  return Boolean( metadata && Array.isArray( metadata.chauffeurIds ) );
}

export function buildMessageThreads(
  items: NotificationItem[],
  search: string
): { threads: MessageThread[]; broadcasts: NotificationItem[] } {
  const messages = items.filter( isThreadable );
  const broadcasts = messages.filter( isBroadcast );
  const grouped = new Map<string, NotificationItem[]>();

  for ( const item of messages ) {
    if ( isBroadcast( item ) ) continue;
    const key = riderKeyFor( item );
    if ( !key ) continue;
    const bucket = grouped.get( key );
    if ( bucket ) bucket.push( item );
    else grouped.set( key, [ item ] );
  }

  let threads: MessageThread[] = [ ...grouped.entries() ].map( ( [ key, threadMessages ] ) => {
    const sorted = [ ...threadMessages ].sort(
      ( a, b ) => new Date( a.createdAt ).getTime() - new Date( b.createdAt ).getTime()
    );
    const messagesOnly = sorted.filter( message => message.category === "messages" );
    const last = messagesOnly[ messagesOnly.length - 1 ] || sorted[ sorted.length - 1 ];
    const metadata = metadataOf( last );
    const riderName = ( metadata && getString( metadata.passengerName ) ) || "Unknown rider";
    const riderEmail = ( metadata && getString( metadata.passengerEmail ) ) || null;

    return {
      key,
      riderName,
      riderEmail: riderEmail || null,
      bookingReference: last.bookingReference || null,
      messages: sorted,
      unreadCount: messagesOnly.filter( message => isInbound( message ) && !message.readAt ).length,
      lastActivity: ( messagesOnly[ messagesOnly.length - 1 ] || last ).createdAt,
    };
  } );

  threads.sort( ( a, b ) => new Date( b.lastActivity ).getTime() - new Date( a.lastActivity ).getTime() );

  const query = search.trim().toLowerCase();
  if ( query ) {
    threads = threads.filter( thread =>
      thread.riderName.toLowerCase().includes( query )
      || thread.riderEmail?.toLowerCase().includes( query )
      || thread.messages.some( message =>
        message.title.toLowerCase().includes( query )
        || message.body.toLowerCase().includes( query )
        || message.bookingReference?.toLowerCase().includes( query )
      )
    );
  }

  return { threads, broadcasts };
}
