import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first } from "@/lib/pocketbase/core";
import { createPocketBasePaymentStatusUpdate } from "@/lib/pocketbase/notifications";

const pb = () => getPocketBaseClient();

export async function cancelPaymentReminder( bookingReference: string ): Promise<void> {
  const rows = await pb().collection( pocketBaseCollections.deliveries ).getFullList( {
    filter: pb().filter( "notification.bookingReference = {:reference} && template = 'payment_reminder' && (status = 'pending' || status = 'processing')", { reference: bookingReference } ),
    fields: "id",
    expand: "notification",
  } );
  await Promise.all( rows.map( row => pb().collection( pocketBaseCollections.deliveries ).update( row.id, { status: "cancelled", leaseToken: "", leaseExpiresAt: "" } ) ) );
}

export async function expirePaymentHolds( now = new Date() ): Promise<number> {
  const pocketBaseNow = now.toISOString().replace( "T", " " );
  const rows = await pb().collection( pocketBaseCollections.bookings ).getFullList( {
    filter: pb().filter( "(status = 'pending_payment' || status = 'payment_review') && holdExpiresAt != '' && holdExpiresAt <= {:now}", { now: pocketBaseNow } ),
    fields: "id,reference,tripDetails",
  } );
  await Promise.all( rows.map( async row => {
    await pb().collection( pocketBaseCollections.bookings ).update( row.id, { status: "payment_expired" } );
    const details = row.tripDetails && typeof row.tripDetails === "object" ? row.tripDetails as Record<string, unknown> : {};
    const discountCode = typeof details.discountCode === "string" ? details.discountCode : "";
    if ( discountCode ) {
      const discount = await first( pocketBaseCollections.discounts, "code = {:code}", { code: discountCode } );
      if ( discount && Number( discount.redemptions || 0 ) > 0 ) {
        await pb().collection( pocketBaseCollections.discounts ).update( discount.id, { redemptions: Number( discount.redemptions ) - 1, sourceUpdatedAt: now.toISOString() } );
      }
    }
    await cancelPaymentReminder( String( row.reference ) );
    const attempts = await pb().collection( pocketBaseCollections.payments ).getFullList( { filter: pb().filter( "bookingReference = {:reference} && (status = 'pending' || status = 'awaiting_verification')", { reference: row.reference } ), fields: "id,legacyId,bookingReference" } );
    await Promise.all( attempts.map( async attempt => {
      await pb().collection( pocketBaseCollections.payments ).update( attempt.id, { status: "expired", sourceUpdatedAt: now.toISOString() } );
      await createPocketBasePaymentStatusUpdate( {
        id: Number( attempt.legacyId ),
        bookingReference: String( attempt.bookingReference ),
        status: "expired",
      } ).catch( error => console.error( `Unable to create expired payment notification for ${ attempt.legacyId }`, error ) );
    } ) );
  } ) );
  return rows.length;
}
