import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first } from "@/lib/pocketbase/core";
import { createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";
import { getBookingByReference, type BookingRecord } from "@/lib/pocketbase/repository";

// A round trip is two bookings. The outbound leg carries the combined fare and
// the payment link; the return leg is priced at zero and follows the outbound
// leg through the payment lifecycle.
export type RoundTripLink =
  | { leg: "outbound"; pairedReference: string }
  | { leg: "return"; pairedReference: string };

const AWAITING_PAYMENT = [ "pending_payment", "payment_review" ];

export function roundTripLink( tripDetails: unknown ): RoundTripLink | null {
  let details = tripDetails;
  if ( typeof details === "string" ) {
    try {
      details = JSON.parse( details );
    } catch {
      return null;
    }
  }
  const value = details && typeof details === "object" ? ( details as Record<string, unknown> ).roundTrip : null;
  if ( !value || typeof value !== "object" ) return null;
  const { leg, pairedReference } = value as Record<string, unknown>;
  if ( ( leg !== "outbound" && leg !== "return" ) || typeof pairedReference !== "string" || !pairedReference ) return null;
  return { leg, pairedReference };
}

/**
 * Mirrors a payment-driven change on an outbound leg onto its return leg.
 * Only applies while the return leg is still waiting on that payment, so once
 * both legs are confirmed they can be managed independently. `force` is for
 * changes that always cover both legs, such as a refund of the combined fare.
 */
export async function syncReturnLeg(
  outboundReference: string,
  updates: { status?: string; holdExpiresAt?: string },
  options: { force?: boolean } = {},
): Promise<BookingRecord | undefined> {
  const outbound = await getBookingByReference( outboundReference );
  const link = outbound ? roundTripLink( outbound.tripDetails ) : null;
  if ( link?.leg !== "outbound" ) return undefined;

  const row = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: link.pairedReference } );
  if ( !row ) return undefined;
  // A late payment can revive an outbound hold that already expired; the return leg comes back with it.
  const followable = updates.status === "confirmed" ? [ ...AWAITING_PAYMENT, "payment_expired" ] : AWAITING_PAYMENT;
  if ( !options.force && !followable.includes( String( row.status ) ) ) return undefined;

  const changes: Record<string, unknown> = {};
  if ( updates.status && updates.status !== row.status ) changes.status = updates.status;
  if ( updates.status === "confirmed" && outbound?.paymentConfirmedAt ) changes.paymentConfirmedAt = outbound.paymentConfirmedAt;
  if ( updates.holdExpiresAt !== undefined ) changes.holdExpiresAt = updates.holdExpiresAt;
  if ( !Object.keys( changes ).length ) return undefined;

  await getPocketBaseClient().collection( pocketBaseCollections.bookings ).update( row.id, changes );
  const returnLeg = await getBookingByReference( link.pairedReference );
  if ( returnLeg && changes.status ) {
    await createPocketBaseBookingStatusUpdate( returnLeg ).catch( error => {
      console.error( `Unable to notify status change for return leg ${ link.pairedReference }`, error );
    } );
  }
  return returnLeg;
}
