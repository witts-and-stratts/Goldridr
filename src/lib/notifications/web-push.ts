import type { RecordModel } from "pocketbase";
import webpush from "web-push";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { legacyId } from "@/lib/pocketbase/core";
import {
  isStaleWebPushError,
  type SerializableWebPushSubscription,
  type WebPushPayload,
  type WebPushSender,
  type WebPushSendResult,
  transmitWebPush,
} from "./web-push-shared";

export { isStaleWebPushError, isTransientWebPushError } from "./web-push-shared";
export type { SerializableWebPushSubscription, WebPushPayload } from "./web-push-shared";

function vapidConfiguration() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "";
  return { publicKey, privateKey, subject, configured: Boolean( publicKey && privateKey && subject ) };
}

export function isWebPushConfigured(): boolean {
  return vapidConfiguration().configured;
}

function configureVapid(): void {
  const config = vapidConfiguration();
  if ( !config.configured ) throw new Error( "Web Push VAPID credentials are not configured" );
  webpush.setVapidDetails( config.subject, config.publicKey, config.privateKey );
}

function mapSubscription( record: RecordModel ) {
  return {
    id: record.id,
    userId: String( record.userId ),
    endpoint: String( record.endpoint ),
    expirationTime: record.expirationTime ? Number( record.expirationTime ) : null,
    keys: { p256dh: String( record.p256dh ), auth: String( record.auth ) },
  };
}

export async function saveWebPushSubscription(
  userId: string,
  input: SerializableWebPushSubscription,
  userAgent = "",
): Promise<string> {
  const pb = getPocketBaseClient();
  const now = new Date().toISOString();
  const records = await pb.collection( pocketBaseCollections.webPushSubscriptions ).getFullList( {
    filter: pb.filter( "endpoint = {:endpoint}", { endpoint: input.endpoint } ),
  } );
  const values = {
    userId,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    expirationTime: input.expirationTime || 0,
    userAgent: userAgent.slice( 0, 1000 ),
    sourceUpdatedAt: now,
  };
  if ( records[ 0 ] ) {
    const updated = await pb.collection( pocketBaseCollections.webPushSubscriptions ).update( records[ 0 ].id, values );
    return updated.id;
  }
  const created = await pb.collection( pocketBaseCollections.webPushSubscriptions ).create( {
    ...values,
    sourceCreatedAt: now,
  } );
  return created.id;
}

export async function deleteWebPushSubscription( userId: string, endpoint: string ): Promise<boolean> {
  const pb = getPocketBaseClient();
  const rows = await pb.collection( pocketBaseCollections.webPushSubscriptions ).getFullList( {
    filter: pb.filter( "userId = {:userId} && endpoint = {:endpoint}", { userId, endpoint } ),
    fields: "id",
  } );
  await Promise.all( rows.map( row => pb.collection( pocketBaseCollections.webPushSubscriptions ).delete( row.id ) ) );
  return rows.length > 0;
}

export async function enqueueWebPushDeliveries(
  notification: RecordModel,
  recipients: RecordModel[],
): Promise<void> {
  if ( !isWebPushConfigured() || recipients.length === 0 ) return;
  const pb = getPocketBaseClient();
  const now = new Date().toISOString();
  const subscriptionsByUser = new Map<string, RecordModel[]>();

  await Promise.all( [ ...new Set( recipients.map( recipient => String( recipient.userId ) ) ) ].map( async userId => {
    const subscriptions = await pb.collection( pocketBaseCollections.webPushSubscriptions ).getFullList( {
      filter: pb.filter( "userId = {:userId}", { userId } ),
    } );
    subscriptionsByUser.set( userId, subscriptions );
  } ) );

  await Promise.all( recipients.flatMap( recipient => {
    const recipientId = Number( recipient.legacyId );
    const payload: WebPushPayload = {
      title: String( notification.title ),
      body: String( notification.body ),
      recipientId,
      url: `/admin/notifications?item=${ recipientId }`,
      icon: "/admin-icons/icon-192.png",
      badge: "/admin-icons/icon-192.png",
      tag: `goldridr-admin-${ recipientId }`,
    };
    return ( subscriptionsByUser.get( String( recipient.userId ) ) || [] ).map( subscription =>
      pb.collection( pocketBaseCollections.deliveries ).create( {
        legacyId: legacyId(),
        notification: notification.id,
        channel: "web_push",
        recipient: subscription.id,
        template: "web_push",
        payload,
        idempotencyKey: `web-push:${ notification.id }:${ recipient.id }:${ subscription.id }`,
        status: "pending",
        scheduledAt: now,
        nextAttemptAt: now,
        attempts: 0,
      } )
    );
  } ) );
}

export async function sendWebPushDelivery(
  subscriptionId: string,
  payload: WebPushPayload,
  sender: WebPushSender = webpush,
): Promise<WebPushSendResult> {
  const pb = getPocketBaseClient();
  let record: RecordModel;
  try {
    record = await pb.collection( pocketBaseCollections.webPushSubscriptions ).getOne( subscriptionId );
  } catch {
    const missing = new Error( "Web Push subscription no longer exists" ) as Error & { statusCode: number };
    missing.statusCode = 410;
    throw missing;
  }

  configureVapid();
  const subscription = mapSubscription( record );
  try {
    return await transmitWebPush( subscription, payload, sender, subscriptionId );
  } catch ( error ) {
    if ( isStaleWebPushError( error ) ) {
      await pb.collection( pocketBaseCollections.webPushSubscriptions ).delete( subscriptionId ).catch( () => undefined );
    }
    throw error;
  }
}

export async function sendTestWebPush( userId: string, endpoint: string ): Promise<void> {
  const pb = getPocketBaseClient();
  const row = await pb.collection( pocketBaseCollections.webPushSubscriptions ).getFirstListItem(
    pb.filter( "userId = {:userId} && endpoint = {:endpoint}", { userId, endpoint } ),
  );
  await sendWebPushDelivery( row.id, {
    title: "GoldRidr notifications are on",
    body: "This device will now receive new booking, payment, cancellation, and inbox alerts.",
    recipientId: 0,
    url: "/admin/settings",
    icon: "/admin-icons/icon-192.png",
    badge: "/admin-icons/icon-192.png",
    tag: "goldridr-admin-test",
  } );
}
