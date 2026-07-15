import { randomUUID } from "crypto";
import type { RecordModel } from "pocketbase";
import type { NotificationDeliveryRecord, DeliveryStatus } from "./types";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";

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

function legacyId( record: RecordModel, label: string ): number {
  const value = Number( record.legacyId );
  if ( !Number.isSafeInteger( value ) || value < 1 ) throw new Error( `${ label } ${ record.id } has no numeric legacyId` );
  return value;
}

function mapDelivery( record: RecordModel ): NotificationDeliveryRecord {
  const notification = record.expand?.notification as RecordModel | undefined;
  if ( !notification ) throw new Error( `Delivery ${ record.id } has no expanded notification` );
  return {
    id: legacyId( record, "Delivery" ),
    backendId: record.id,
    notificationId: legacyId( notification, "Notification" ),
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
  async claim( limit = 20, leaseMs = 60_000 ): Promise<NotificationDeliveryRecord[]> {
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
    const claimed = await Promise.all( candidates.items.map( record =>
      pb.collection( pocketBaseCollections.deliveries ).update( record.id, {
        status: "processing",
        leaseToken: token,
        leaseExpiresAt,
      }, { expand: "notification" } )
    ) );
    return claimed.map( mapDelivery );
  }

  async update( delivery: NotificationDeliveryRecord, values: DeliveryUpdate ): Promise<void> {
    if ( !delivery.backendId ) throw new Error( `PocketBase delivery ${ delivery.id } has no backendId` );
    const data: Record<string, unknown> = { ...values };
    for ( const key of [ "leaseToken", "leaseExpiresAt", "provider", "providerMessageId", "response", "lastError" ] ) {
      if ( data[ key ] === null ) data[ key ] = "";
    }
    await getPocketBaseClient().collection( pocketBaseCollections.deliveries ).update( delivery.backendId, data );
  }
}

export function createNotificationQueue(): NotificationQueue {
  return new PocketBaseNotificationQueue();
}
