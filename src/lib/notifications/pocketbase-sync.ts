import type { DatabaseLike } from "@/lib/db-client";
import { isPocketBaseConfigured, isPocketBaseNotificationWriteEnabled } from "@/lib/pocketbase/config";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { getPocketBaseClient } from "@/lib/pocketbase/client";

interface NotificationSource {
  id: number;
  eventKey: string;
  type: string;
  category: string;
  title: string;
  body: string;
  bookingReference: string | null;
  actorUserId: string | null;
  metadata: string;
  createdAt: string;
}

function jsonValue( value: string | null, fallback: unknown ): unknown {
  if ( !value ) return fallback;
  try {
    return JSON.parse( value );
  } catch {
    return fallback;
  }
}

function nullable( value: unknown ): string {
  return typeof value === "string" && value ? value : "";
}

async function findByFilter( collection: string, expression: string, params: Record<string, unknown> ) {
  const pb = getPocketBaseClient();
  try {
    return await pb.collection( collection ).getFirstListItem( pb.filter( expression, params ) );
  } catch ( error ) {
    if ( typeof error === "object" && error !== null && "status" in error && error.status === 404 ) return null;
    throw error;
  }
}

async function upsert(
  collection: string,
  expression: string,
  params: Record<string, unknown>,
  data: Record<string, unknown>
) {
  const pb = getPocketBaseClient();
  const existing = await findByFilter( collection, expression, params );
  return existing
    ? pb.collection( collection ).update( existing.id, data )
    : pb.collection( collection ).create( data );
}

export async function enqueuePocketBaseNotificationSync( db: DatabaseLike, notificationId: number ): Promise<void> {
  if ( !isPocketBaseNotificationWriteEnabled() ) return;
  await db.prepare( `
    INSERT INTO pocketbase_notification_outbox (notificationId)
    VALUES (?)
    ON CONFLICT(notificationId) DO UPDATE SET
      nextAttemptAt = CURRENT_TIMESTAMP,
      lastError = NULL,
      updatedAt = CURRENT_TIMESTAMP
  ` ).run( notificationId );
}

export async function syncPocketBasePushToken(
  token: string,
  userId: string,
  platform: string,
  createdAt?: string,
  updatedAt?: string
): Promise<void> {
  if ( !isPocketBaseNotificationWriteEnabled() ) return;
  if ( !isPocketBaseConfigured() ) throw new Error( "PocketBase notification writes are enabled but PocketBase is not configured" );
  await upsert(
    pocketBaseCollections.pushTokens,
    "token = {:token}",
    { token },
    {
      token,
      userId,
      platform: [ "ios", "android", "web" ].includes( platform ) ? platform : "unknown",
      sourceCreatedAt: createdAt || new Date().toISOString(),
      sourceUpdatedAt: updatedAt || new Date().toISOString(),
    }
  );
}

export async function deletePocketBasePushToken( token: string ): Promise<void> {
  if ( !isPocketBaseNotificationWriteEnabled() ) return;
  if ( !isPocketBaseConfigured() ) throw new Error( "PocketBase notification writes are enabled but PocketBase is not configured" );
  const record = await findByFilter( pocketBaseCollections.pushTokens, "token = {:token}", { token } );
  if ( record ) await getPocketBaseClient().collection( pocketBaseCollections.pushTokens ).delete( record.id );
}

export async function syncPocketBaseProviderEvent(
  provider: string,
  providerEventId: string,
  providerMessageId: string | undefined,
  eventType: string,
  payload: unknown
): Promise<void> {
  if ( !isPocketBaseNotificationWriteEnabled() ) return;
  if ( !isPocketBaseConfigured() ) throw new Error( "PocketBase notification writes are enabled but PocketBase is not configured" );
  await upsert(
    pocketBaseCollections.providerEvents,
    "provider = {:provider} && providerEventId = {:providerEventId}",
    { provider, providerEventId },
    {
      provider,
      providerEventId,
      providerMessageId: providerMessageId || "",
      eventType,
      payload: payload || {},
      sourceReceivedAt: new Date().toISOString(),
    }
  );

  if ( !providerMessageId ) return;
  const normalized = eventType.toLowerCase();
  const status = normalized.includes( "delivered" ) || normalized === "delivery"
    ? "delivered"
    : normalized.includes( "bounce" ) || normalized.includes( "complaint" )
      || normalized.includes( "failed" ) || normalized.includes( "suppressed" )
      ? "failed"
      : null;
  if ( !status ) return;
  const pb = getPocketBaseClient();
  const deliveries = await pb.collection( pocketBaseCollections.deliveries ).getFullList( {
    filter: pb.filter(
      "provider = {:provider} && providerMessageId = {:providerMessageId}",
      { provider, providerMessageId }
    ),
  } );
  await Promise.all( deliveries.map( delivery =>
    pb.collection( pocketBaseCollections.deliveries ).update( delivery.id, { status, providerMetadata: payload || {} } )
  ) );
}

export async function syncPocketBaseNotification( db: DatabaseLike, notificationId: number ): Promise<void> {
  const notification = await db.prepare(
    "SELECT * FROM notifications WHERE id = ?"
  ).get( notificationId ) as NotificationSource | undefined;
  if ( !notification ) return;

  const target = await upsert(
    pocketBaseCollections.notifications,
    "eventKey = {:eventKey}",
    { eventKey: notification.eventKey },
    {
      legacyId: notification.id,
      eventKey: notification.eventKey,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      body: notification.body,
      bookingReference: notification.bookingReference || "",
      actorUserId: notification.actorUserId || "",
      metadata: jsonValue( notification.metadata, {} ),
      sourceCreatedAt: notification.createdAt,
    }
  );

  const recipients = await db.prepare(
    "SELECT * FROM notification_recipients WHERE notificationId = ? ORDER BY id"
  ).all( notificationId ) as Array<{ id: number; userId: string; readAt: string | null; createdAt: string }>;
  for ( const recipient of recipients ) {
    await upsert(
      pocketBaseCollections.recipients,
      "legacyId = {:legacyId}",
      { legacyId: recipient.id },
      {
        legacyId: recipient.id,
        notification: target.id,
        userId: recipient.userId,
        readAt: nullable( recipient.readAt ),
        sourceCreatedAt: recipient.createdAt,
      }
    );
  }

  const deliveries = await db.prepare(
    "SELECT * FROM notification_deliveries WHERE notificationId = ? ORDER BY id"
  ).all( notificationId ) as Array<Record<string, unknown>>;
  for ( const delivery of deliveries ) {
    await upsert(
      pocketBaseCollections.deliveries,
      "idempotencyKey = {:idempotencyKey}",
      { idempotencyKey: String( delivery.idempotencyKey ) },
      {
        legacyId: Number( delivery.id ),
        notification: target.id,
        channel: String( delivery.channel ),
        recipient: String( delivery.recipient ),
        template: nullable( delivery.template ),
        payload: jsonValue( nullable( delivery.payload ), {} ),
        idempotencyKey: String( delivery.idempotencyKey ),
        status: String( delivery.status ),
        scheduledAt: nullable( delivery.scheduledAt ),
        nextAttemptAt: nullable( delivery.nextAttemptAt ),
        attempts: Number( delivery.attempts || 0 ),
        leaseToken: nullable( delivery.leaseToken ),
        leaseExpiresAt: nullable( delivery.leaseExpiresAt ),
        provider: nullable( delivery.provider ),
        providerMessageId: nullable( delivery.providerMessageId ),
        accepted: jsonValue( nullable( delivery.accepted ), [] ),
        rejected: jsonValue( nullable( delivery.rejected ), [] ),
        response: nullable( delivery.response ),
        providerMetadata: jsonValue( nullable( delivery.providerMetadata ), {} ),
        lastError: nullable( delivery.lastError ),
        sourceCreatedAt: nullable( delivery.createdAt ),
        sourceUpdatedAt: nullable( delivery.updatedAt ),
      }
    );
  }
}

export async function drainPocketBaseNotificationOutbox( db: DatabaseLike, limit = 20 ): Promise<void> {
  if ( !isPocketBaseNotificationWriteEnabled() ) return;
  if ( !isPocketBaseConfigured() ) {
    throw new Error( "PocketBase notification writes are enabled but PocketBase is not configured" );
  }

  const rows = await db.prepare( `
    SELECT id, notificationId, attempts
    FROM pocketbase_notification_outbox
    WHERE datetime(nextAttemptAt) <= datetime('now')
    ORDER BY id
    LIMIT ?
  ` ).all( limit ) as Array<{ id: number; notificationId: number; attempts: number }>;

  for ( const row of rows ) {
    try {
      await syncPocketBaseNotification( db, row.notificationId );
      await db.prepare( "DELETE FROM pocketbase_notification_outbox WHERE id = ?" ).run( row.id );
    } catch ( error ) {
      const attempts = row.attempts + 1;
      const delaySeconds = Math.min( 300, 2 ** Math.min( attempts, 8 ) );
      await db.prepare( `
        UPDATE pocketbase_notification_outbox
        SET attempts = ?, nextAttemptAt = datetime('now', ?), lastError = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      ` ).run( attempts, `+${ delaySeconds } seconds`, error instanceof Error ? error.message : String( error ), row.id );
    }
  }
}
