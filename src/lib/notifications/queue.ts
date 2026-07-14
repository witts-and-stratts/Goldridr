import { randomUUID } from "crypto";
import type { RecordModel } from "pocketbase";
import type { InValue } from "@libsql/client";
import type { NotificationDeliveryRecord, DeliveryStatus } from "./types";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { isPocketBaseConfigured, isPocketBaseDeliveryQueueEnabled } from "@/lib/pocketbase/config";
import { enqueuePocketBaseNotificationSync } from "./pocketbase-sync";

export interface DeliveryUpdate {
  status: DeliveryStatus;
  attempts?: number;
  nextAttemptAt?: string;
  leaseToken?: string | null;
  leaseExpiresAt?: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
  accepted?: string[];
  rejected?: string[];
  response?: string | null;
  providerMetadata?: Record<string, unknown>;
  lastError?: string | null;
}

export interface NotificationQueue {
  claim( limit?: number, leaseMs?: number ): Promise<NotificationDeliveryRecord[]>;
  update( delivery: NotificationDeliveryRecord, values: DeliveryUpdate ): Promise<void>;
}

export class SqliteNotificationQueue implements NotificationQueue {
  async claim( limit?: number, leaseMs?: number ): Promise<NotificationDeliveryRecord[]> {
    const { getDb } = await import( "@/lib/db" );
    const { claimDeliveries } = await import( "./store" );
    return claimDeliveries( await getDb(), limit, leaseMs );
  }

  async update( delivery: NotificationDeliveryRecord, values: DeliveryUpdate ): Promise<void> {
    const { getDb } = await import( "@/lib/db" );
    const db = await getDb();
    const fields: string[] = [ "status = ?" ];
    const params: InValue[] = [ values.status ];
    const add = ( column: string, value: InValue ) => {
      fields.push( `${ column } = ?` );
      params.push( value );
    };

    if ( values.attempts !== undefined ) add( "attempts", values.attempts );
    if ( values.nextAttemptAt !== undefined ) add( "nextAttemptAt", values.nextAttemptAt );
    if ( values.leaseToken !== undefined ) add( "leaseToken", values.leaseToken );
    if ( values.leaseExpiresAt !== undefined ) add( "leaseExpiresAt", values.leaseExpiresAt );
    if ( values.provider !== undefined ) add( "provider", values.provider );
    if ( values.providerMessageId !== undefined ) add( "providerMessageId", values.providerMessageId );
    if ( values.accepted !== undefined ) add( "accepted", JSON.stringify( values.accepted ) );
    if ( values.rejected !== undefined ) add( "rejected", JSON.stringify( values.rejected ) );
    if ( values.response !== undefined ) add( "response", values.response );
    if ( values.providerMetadata !== undefined ) add( "providerMetadata", JSON.stringify( values.providerMetadata ) );
    if ( values.lastError !== undefined ) add( "lastError", values.lastError );
    fields.push( "updatedAt = CURRENT_TIMESTAMP" );
    params.push( delivery.id );
    await db.prepare( `UPDATE notification_deliveries SET ${ fields.join( ", " ) } WHERE id = ?` ).run( ...params );
    await enqueuePocketBaseNotificationSync( db, delivery.notificationId );
  }
}

function requiredLegacyId( record: RecordModel, label: string ): number {
  const id = Number( record.legacyId );
  if ( !Number.isInteger( id ) || id <= 0 ) throw new Error( `${ label } ${ record.id } has no legacyId` );
  return id;
}

function mapPocketBaseDelivery( record: RecordModel ): NotificationDeliveryRecord {
  const notification = record.expand?.notification as RecordModel | undefined;
  if ( !notification ) throw new Error( `Delivery ${ record.id } has no expanded notification` );
  return {
    id: requiredLegacyId( record, "Delivery" ),
    backendId: record.id,
    notificationId: requiredLegacyId( notification, "Notification" ),
    channel: record.channel,
    recipient: String( record.recipient ),
    template: record.template ? String( record.template ) : null,
    payload: JSON.stringify( record.payload || {} ),
    idempotencyKey: String( record.idempotencyKey ),
    status: record.status,
    scheduledAt: String( record.scheduledAt ),
    nextAttemptAt: String( record.nextAttemptAt ),
    attempts: Number( record.attempts || 0 ),
    leaseToken: record.leaseToken ? String( record.leaseToken ) : null,
    leaseExpiresAt: record.leaseExpiresAt ? String( record.leaseExpiresAt ) : null,
  };
}

export class PocketBaseNotificationQueue implements NotificationQueue {
  private readonly sqlite = new SqliteNotificationQueue();

  async claim( limit = 20, leaseMs = 60_000 ): Promise<NotificationDeliveryRecord[]> {
    if ( !isPocketBaseConfigured() ) throw new Error( "PocketBase delivery queue is enabled but PocketBase is not configured" );
    const pb = getPocketBaseClient();
    const now = new Date().toISOString();
    const candidates = await pb.collection( pocketBaseCollections.deliveries ).getList( 1, Math.min( limit, 100 ), {
      filter: pb.filter(
        "(status = 'pending' || status = 'processing') && nextAttemptAt <= {:now} && (leaseExpiresAt = '' || leaseExpiresAt <= {:now})",
        { now }
      ),
      sort: "nextAttemptAt,legacyId",
      expand: "notification",
    } );
    const token = randomUUID();
    const leaseExpiresAt = new Date( Date.now() + leaseMs ).toISOString();
    const deliveries: NotificationDeliveryRecord[] = [];
    for ( const candidate of candidates.items ) {
      const updated = await pb.collection( pocketBaseCollections.deliveries ).update( candidate.id, {
        status: "processing",
        leaseToken: token,
        leaseExpiresAt,
      }, { expand: "notification" } );
      const delivery = mapPocketBaseDelivery( updated );
      await this.sqlite.update( delivery, { status: "processing", leaseToken: token, leaseExpiresAt } );
      deliveries.push( delivery );
    }
    return deliveries;
  }

  async update( delivery: NotificationDeliveryRecord, values: DeliveryUpdate ): Promise<void> {
    if ( !delivery.backendId ) throw new Error( `PocketBase delivery ${ delivery.id } has no backendId` );
    const pb = getPocketBaseClient();
    const data: Record<string, unknown> = { ...values };
    for ( const key of [ "leaseToken", "leaseExpiresAt", "provider", "providerMessageId", "response", "lastError" ] ) {
      if ( data[ key ] === null ) data[ key ] = "";
    }
    await pb.collection( pocketBaseCollections.deliveries ).update( delivery.backendId, data );
    await this.sqlite.update( delivery, values );
  }
}

export function createNotificationQueue(): NotificationQueue {
  return isPocketBaseDeliveryQueueEnabled()
    ? new PocketBaseNotificationQueue()
    : new SqliteNotificationQueue();
}
