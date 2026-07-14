import type { RecordModel } from "pocketbase";
import { getPocketBaseServerClient } from "@/lib/pocketbase/server";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import type { NotificationCategory, NotificationRecord } from "./types";

type InboxNotification = NotificationRecord & { recipientId: number; readAt: string | null };

function dateOrNull( value: unknown ): string | null {
  return typeof value === "string" && value ? value : null;
}

function legacyId( record: RecordModel ): number {
  const value = Number( record.legacyId );
  if ( !Number.isInteger( value ) || value <= 0 ) {
    throw new Error( `${ record.collectionName } record ${ record.id } has no legacyId` );
  }
  return value;
}

function expandedNotification( recipient: RecordModel ): RecordModel {
  const notification = recipient.expand?.notification as RecordModel | undefined;
  if ( !notification ) throw new Error( `Notification recipient ${ recipient.id } has no expanded notification` );
  return notification;
}

export function mapPocketBaseRecipient( recipient: RecordModel ): InboxNotification {
  const notification = expandedNotification( recipient );
  const metadata = notification.metadata && typeof notification.metadata === "object"
    ? JSON.stringify( notification.metadata )
    : "{}";
  return {
    id: legacyId( notification ),
    recipientId: legacyId( recipient ),
    eventKey: String( notification.eventKey ),
    type: String( notification.type ),
    category: notification.category as NotificationCategory,
    title: String( notification.title ),
    body: String( notification.body ),
    bookingReference: notification.bookingReference ? String( notification.bookingReference ) : null,
    metadata,
    createdAt: String( notification.sourceCreatedAt || notification.created ),
    readAt: dateOrNull( recipient.readAt ),
  };
}

function recipientFilter(
  userId: string,
  options: { unreadOnly?: boolean; category?: string; afterId?: number; recipientIds?: number[] } = {}
): string {
  const pb = getPocketBaseServerClient();
  const filters = [ pb.filter( "userId = {:userId}", { userId } ) ];
  if ( options.unreadOnly ) filters.push( "readAt = ''" );
  if ( options.category ) filters.push( pb.filter( "notification.category = {:category}", { category: options.category } ) );
  if ( options.afterId ) filters.push( pb.filter( "legacyId > {:afterId}", { afterId: options.afterId } ) );
  if ( options.recipientIds?.length ) {
    const ids = options.recipientIds.map( Number ).filter( value => Number.isInteger( value ) && value > 0 );
    if ( ids.length === 0 ) return "id = ''";
    filters.push( `(${ ids.map( id => pb.filter( "legacyId = {:id}", { id } ) ).join( " || " ) })` );
  }
  return filters.join( " && " );
}

export async function listPocketBaseNotifications(
  userId: string,
  options: { unreadOnly?: boolean; category?: string; limit?: number; afterId?: number } = {}
): Promise<InboxNotification[]> {
  const pb = getPocketBaseServerClient();
  const result = await pb.collection( pocketBaseCollections.recipients ).getList( 1, Math.min( options.limit || 50, 100 ), {
    filter: recipientFilter( userId, options ),
    sort: "-legacyId",
    expand: "notification",
  } );
  return result.items.map( mapPocketBaseRecipient );
}

export async function getPocketBaseUnreadCount( userId: string ): Promise<number> {
  const pb = getPocketBaseServerClient();
  const result = await pb.collection( pocketBaseCollections.recipients ).getList( 1, 1, {
    filter: recipientFilter( userId, { unreadOnly: true } ),
    fields: "id",
  } );
  return result.totalItems;
}

async function mutateRecipients(
  userId: string,
  recipientIds: number[] | undefined,
  operation: (record: RecordModel) => Promise<unknown>
): Promise<number> {
  const pb = getPocketBaseServerClient();
  const records = await pb.collection( pocketBaseCollections.recipients ).getFullList( {
    filter: recipientFilter( userId, { recipientIds } ),
    fields: "id,legacyId,readAt",
  } );
  await Promise.all( records.map( operation ) );
  return records.length;
}

export function markPocketBaseNotificationsRead( userId: string, recipientIds?: number[] ): Promise<number> {
  const pb = getPocketBaseServerClient();
  const readAt = new Date().toISOString();
  return mutateRecipients( userId, recipientIds, record =>
    record.readAt
      ? Promise.resolve()
      : pb.collection( pocketBaseCollections.recipients ).update( record.id, { readAt } )
  );
}

export function markPocketBaseNotificationsUnread( userId: string, recipientIds?: number[] ): Promise<number> {
  const pb = getPocketBaseServerClient();
  return mutateRecipients( userId, recipientIds, record =>
    record.readAt
      ? pb.collection( pocketBaseCollections.recipients ).update( record.id, { readAt: "" } )
      : Promise.resolve()
  );
}

export function deletePocketBaseNotifications( userId: string, recipientIds?: number[] ): Promise<number> {
  const pb = getPocketBaseServerClient();
  return mutateRecipients( userId, recipientIds, record =>
    pb.collection( pocketBaseCollections.recipients ).delete( record.id )
  );
}

export async function getPocketBasePreferences(
  userId: string
): Promise<Array<{ category: NotificationCategory; inApp: number; email: number; sms: number }>> {
  const pb = getPocketBaseServerClient();
  const records = await pb.collection( pocketBaseCollections.preferences ).getFullList( {
    filter: pb.filter( "userId = {:userId}", { userId } ),
    sort: "category",
  } );
  return records.map( record => ( {
    category: record.category as NotificationCategory,
    inApp: Number( Boolean( record.inApp ) ),
    email: Number( Boolean( record.email ) ),
    sms: Number( Boolean( record.sms ) ),
  } ) );
}

export async function setPocketBasePreference(
  userId: string,
  category: NotificationCategory,
  preference: { inApp: boolean; email: boolean; sms: boolean }
): Promise<void> {
  const pb = getPocketBaseServerClient();
  const filter = pb.filter( "userId = {:userId} && category = {:category}", { userId, category } );
  const data = { userId, category, ...preference, sourceUpdatedAt: new Date().toISOString() };
  try {
    const existing = await pb.collection( pocketBaseCollections.preferences ).getFirstListItem( filter );
    await pb.collection( pocketBaseCollections.preferences ).update( existing.id, data );
  } catch ( error ) {
    if ( typeof error === "object" && error !== null && "status" in error && error.status === 404 ) {
      await pb.collection( pocketBaseCollections.preferences ).create( data );
      return;
    }
    throw error;
  }
}
