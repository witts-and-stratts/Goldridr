import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "@/lib/admin-settings";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first } from "@/lib/pocketbase/core";

function trackingSecret(): string {
  const secret = process.env.EMAIL_TRACKING_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if ( !secret ) throw new Error( "EMAIL_TRACKING_SECRET or AUTH_SECRET is required for email read tracking" );
  return secret;
}

function signature( deliveryId: number ): string {
  return createHmac( "sha256", trackingSecret() ).update( String( deliveryId ) ).digest( "hex" );
}

export async function createEmailOpenTrackingUrl( deliveryId: number ): Promise<string> {
  const appUrl = ( await getAppUrl() ).replace( /\/$/, "" );
  return `${ appUrl }/api/track/email/${ deliveryId }.${ signature( deliveryId ) }`;
}

export function trackedDeliveryId( token: string ): number | null {
  const match = /^(\d+)\.([a-f0-9]{64})$/.exec( token );
  if ( !match ) return null;
  const deliveryId = Number( match[ 1 ] );
  if ( !Number.isSafeInteger( deliveryId ) || deliveryId < 1 ) return null;
  const expected = Buffer.from( signature( deliveryId ), "hex" );
  const received = Buffer.from( match[ 2 ], "hex" );
  return expected.length === received.length && timingSafeEqual( expected, received ) ? deliveryId : null;
}

export async function recordEmailOpen( deliveryId: number ): Promise<void> {
  const pb = getPocketBaseClient();
  const delivery = await first( pocketBaseCollections.deliveries, "legacyId = {:id} && channel = 'email'", { id: deliveryId } );
  if ( !delivery ) return;
  const readAt = new Date().toISOString();
  await pb.collection( pocketBaseCollections.deliveries ).update( delivery.id, { readAt } );
  const notificationId = String( delivery.notification || "" );
  if ( !notificationId ) return;
  const notification = await pb.collection( pocketBaseCollections.notifications ).getOne( notificationId );
  const metadata = notification.metadata && typeof notification.metadata === "object" ? notification.metadata as Record<string, unknown> : {};
  await pb.collection( pocketBaseCollections.notifications ).update( notification.id, { metadata: { ...metadata, emailReadAt: readAt } } );
}
