import "server-only";
import { randomUUID } from "crypto";
import type { RecordModel } from "pocketbase";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { createWithLegacyId, first } from "@/lib/pocketbase/core";
import { checkBookingClash, getBookingByReference, updateBookingStatus, type BookingRecord } from "@/lib/pocketbase/repository";
import { getPaymentSettings } from "@/lib/admin-settings";
import { paymentTokenHash } from "./tokens";
import { isLegActive, rideReference, type BookingLeg } from "@/lib/booking-legs";
import type { PaymentAttempt, PaymentMethod, PaymentProvider, PaymentRefund, PaymentStatus } from "./types";
import { cancelPaymentReminder } from "./hold-expiry";
import { createPocketBasePaymentStatusUpdate } from "@/lib/pocketbase/notifications";
import { compactPaymentDetails, type StoredPaymentDetails } from "./details";
import { extendedPaymentHoldExpiry } from "./hold-window";

export { cancelPaymentReminder, expirePaymentHolds } from "./hold-expiry";

const pb = () => getPocketBaseClient();
const text = ( value: unknown ) => value ? String( value ) : null;
const positiveNumber = ( value: unknown ) => Number( value ) > 0 ? Number( value ) : null;

function mapPayment( row: RecordModel ): PaymentAttempt {
  return {
    id: Number( row.legacyId ),
    bookingReference: String( row.bookingReference ),
    amountCents: Number( row.amountCents || 0 ),
    currency: String( row.currency || "USD" ),
    method: row.method as PaymentMethod,
    provider: ( row.provider || "manual" ) as PaymentProvider,
    status: row.status as PaymentStatus,
    externalId: text( row.externalId ),
    transactionReference: text( row.transactionReference ),
    idempotencyKey: text( row.idempotencyKey ),
    senderName: text( row.senderName ),
    confirmationReference: text( row.confirmationReference ),
    verificationExpiresAt: text( row.verificationExpiresAt ),
    failureCode: text( row.failureCode ),
    failureMessage: text( row.failureMessage ),
    cardLast4: text( row.cardLast4 ),
    cardBrand: text( row.cardBrand ),
    cardExpiryMonth: positiveNumber( row.cardExpiryMonth ),
    cardExpiryYear: positiveNumber( row.cardExpiryYear ),
    walletType: text( row.walletType ),
    receiptUrl: text( row.receiptUrl ),
    providerMetadata: row.providerMetadata ?? null,
    paidAt: text( row.paidAt ),
    refundedAt: text( row.refundedAt ),
    refundedCents: Number( row.refundedCents || 0 ),
    refunds: Array.isArray( row.refunds ) ? row.refunds as PaymentRefund[] : [],
  };
}

/** Paid payments that still have money left to refund. */
export function isRefundable( payment: Pick<PaymentAttempt, "status" | "amountCents" | "refundedCents"> ): boolean {
  return [ "paid", "partially_refunded" ].includes( payment.status ) && payment.refundedCents < payment.amountCents;
}

export async function findBookingByPaymentToken( token: string ): Promise<BookingRecord | undefined> {
  if ( token.length < 32 || token.length > 200 ) return undefined;
  const row = await first( pocketBaseCollections.bookings, "paymentTokenHash = {:hash}", { hash: paymentTokenHash( token ) } );
  return row ? getBookingByReference( String( row.reference ) ) : undefined;
}

export async function paymentForId( id: number ): Promise<PaymentAttempt | undefined> {
  const row = await first( pocketBaseCollections.payments, "legacyId = {:id}", { id } );
  return row ? mapPayment( row ) : undefined;
}

export async function paymentForExternalId( provider: PaymentProvider, externalId: string ): Promise<PaymentAttempt | undefined> {
  const row = await first( pocketBaseCollections.payments, "provider = {:provider} && externalId = {:externalId}", { provider, externalId } );
  return row ? mapPayment( row ) : undefined;
}

export async function latestPaymentForBooking( bookingReference: string ): Promise<PaymentAttempt | undefined> {
  const completed = await pb().collection( pocketBaseCollections.payments ).getList( 1, 1, {
    filter: pb().filter( "bookingReference = {:bookingReference} && (status = 'paid' || status = 'partially_refunded' || status = 'refunded')", { bookingReference } ),
    sort: "-created",
  } );
  if ( completed.items[ 0 ] ) return mapPayment( completed.items[ 0 ] );
  const rows = await pb().collection( pocketBaseCollections.payments ).getList( 1, 1, {
    filter: pb().filter( "bookingReference = {:bookingReference}", { bookingReference } ),
    sort: "-created",
  } );
  return rows.items[ 0 ] ? mapPayment( rows.items[ 0 ] ) : undefined;
}

export async function extendPaymentHold( bookingReference: string, extensionMinutes: number ): Promise<{ kind: "extended"; holdExpiresAt: string } | { kind: "not_found" | "invalid_status" }> {
  const booking = await getBookingByReference( bookingReference );
  if ( !booking ) return { kind: "not_found" };
  if ( ![ "pending_payment", "payment_review" ].includes( booking.status ) ) return { kind: "invalid_status" };

  const holdExpiresAt = extendedPaymentHoldExpiry( booking.holdExpiresAt ?? null, extensionMinutes );
  const bookingRow = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: bookingReference } );
  if ( !bookingRow ) return { kind: "not_found" };
  await pb().collection( pocketBaseCollections.bookings ).update( bookingRow.id, { holdExpiresAt } );

  if ( booking.status === "payment_review" ) {
    const attempts = await pb().collection( pocketBaseCollections.payments ).getFullList( {
      filter: pb().filter( "bookingReference = {:bookingReference} && status = 'awaiting_verification'", { bookingReference } ),
      fields: "id",
    } );
    await Promise.all( attempts.map( attempt => pb().collection( pocketBaseCollections.payments ).update( attempt.id, { verificationExpiresAt: holdExpiresAt, sourceUpdatedAt: new Date().toISOString() } ) ) );
  }

  return { kind: "extended", holdExpiresAt };
}

export async function createPaymentAttempt( input: { booking: BookingRecord; method: PaymentMethod; provider: PaymentProvider } ): Promise<PaymentAttempt> {
  const idempotencyKey = `${ input.provider }:${ input.booking.reference }:${ input.method }:${ randomUUID() }`;
  const bookingRow = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: input.booking.reference } );
  if ( !bookingRow ) throw new Error( "Booking not found" );
  const row = await createWithLegacyId( pocketBaseCollections.payments, {
    booking: bookingRow.id,
    bookingReference: input.booking.reference,
    amountCents: input.booking.quoteTotalCents || 0,
    currency: input.booking.quoteCurrency || "USD",
    method: input.method,
    provider: input.provider,
    status: "pending",
    idempotencyKey,
    sourceCreatedAt: new Date().toISOString(),
    sourceUpdatedAt: new Date().toISOString(),
  } );
  return mapPayment( row );
}

export async function updatePaymentAttempt( id: number, updates: Record<string, unknown> ): Promise<PaymentAttempt | undefined> {
  const row = await first( pocketBaseCollections.payments, "legacyId = {:id}", { id } );
  if ( !row ) return undefined;
  return mapPayment( await pb().collection( pocketBaseCollections.payments ).update( row.id, { ...updates, sourceUpdatedAt: new Date().toISOString() } ) );
}

async function notifyPaymentStatus( id: number, booking?: BookingRecord ): Promise<void> {
  try {
    const payment = await paymentForId( id );
    if ( payment ) await createPocketBasePaymentStatusUpdate( payment, booking );
  } catch ( error ) {
    console.error( `Unable to create payment notification for ${ id }`, error );
  }
}

export async function markPaymentPaid( payment: PaymentAttempt, transactionReference?: string, metadata?: unknown, details: StoredPaymentDetails = {} ): Promise<{ booking?: BookingRecord; late: boolean }> {
  if ( payment.status === "paid" ) return { booking: await getBookingByReference( payment.bookingReference ), late: false };
  const booking = await getBookingByReference( payment.bookingReference );
  if ( !booking ) throw new Error( "Booking not found" );
  const terminal = [ "cancelled", "rejected" ].includes( booking.status );
  const expired = booking.status === "payment_expired" || Boolean( booking.holdExpiresAt && new Date( booking.holdExpiresAt ).getTime() <= Date.now() );
  const outboundClash = expired && booking.chauffeurId ? ( await checkBookingClash( booking.date, booking.time, booking.duration, booking.chauffeurId ) ).clash : false;
  const returnLeg = booking.returnLeg;
  const returnClash = expired && returnLeg?.chauffeurId ? ( await checkBookingClash( returnLeg.date, returnLeg.time, returnLeg.duration, returnLeg.chauffeurId ) ).clash : false;
  const clash = outboundClash || returnClash;
  if ( terminal || clash ) return { booking, late: true };

  const now = new Date().toISOString();
  await updatePaymentAttempt( payment.id, { status: "paid", transactionReference: transactionReference || payment.transactionReference || "", paidAt: now, providerMetadata: metadata || {}, ...compactPaymentDetails( details ) } );
  const row = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: booking.reference } );
  if ( row ) await pb().collection( pocketBaseCollections.bookings ).update( row.id, { status: "confirmed", paymentConfirmedAt: now } );
  await cancelPaymentReminder( booking.reference );
  const updatedBooking = await getBookingByReference( booking.reference );
  await notifyPaymentStatus( payment.id, updatedBooking );
  return { booking: updatedBooking, late: false };
}

export async function markPaymentFailed( payment: PaymentAttempt, code: string, message: string, metadata?: unknown ): Promise<void> {
  if ( [ "paid", "partially_refunded", "refunded" ].includes( payment.status ) ) return;
  await updatePaymentAttempt( payment.id, { status: "failed", failureCode: code, failureMessage: message, providerMetadata: metadata || {} } );
  await notifyPaymentStatus( payment.id );
}

export async function submitZelleClaim( booking: BookingRecord, senderName: string, confirmationReference: string ): Promise<PaymentAttempt> {
  const { zelleVerificationHours } = await getPaymentSettings();
  const verificationExpiresAt = new Date( Date.now() + zelleVerificationHours * 60 * 60_000 ).toISOString();
  const payment = await createPaymentAttempt( { booking, method: "zelle", provider: "manual" } );
  await updatePaymentAttempt( payment.id, { status: "awaiting_verification", senderName, confirmationReference, verificationExpiresAt } );
  const row = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: booking.reference } );
  if ( row ) await pb().collection( pocketBaseCollections.bookings ).update( row.id, { status: "payment_review", holdExpiresAt: verificationExpiresAt } );
  await cancelPaymentReminder( booking.reference );
  const updated = ( await paymentForId( payment.id ) )!;
  await notifyPaymentStatus( payment.id, booking );
  return updated;
}

/**
 * Records a refund against a payment. Without an amount the rest of the payment
 * is refunded. A refund that empties the payment cancels the whole booking;
 * otherwise only the legs named are cancelled and the rest of the trip stays on.
 */
export async function markPaymentRefunded(
  payment: PaymentAttempt,
  refundReference: string,
  options: { amountCents?: number; legs?: BookingLeg[] } = {},
): Promise<BookingRecord | undefined> {
  const now = new Date().toISOString();
  const current = await paymentForId( payment.id ) ?? payment;
  const remainingCents = Math.max( 0, current.amountCents - current.refundedCents );
  const amountCents = Math.min( remainingCents, options.amountCents ?? remainingCents );
  const refundedCents = current.refundedCents + amountCents;
  const fullyRefunded = refundedCents >= current.amountCents;
  const refund: PaymentRefund = { reference: refundReference, amountCents, legs: fullyRefunded ? [] : options.legs ?? [], refundedAt: now };
  const metadata = current.providerMetadata;
  const providerMetadata = metadata && typeof metadata === "object" && !Array.isArray( metadata )
    ? { ...metadata as Record<string, unknown>, refundReference }
    : { transaction: metadata ?? null, refundReference };
  await updatePaymentAttempt( payment.id, {
    status: fullyRefunded ? "refunded" : "partially_refunded",
    refundedAt: now,
    refundedCents,
    refunds: [ ...current.refunds, refund ],
    providerMetadata,
  } );

  const booking = await getBookingByReference( payment.bookingReference );
  if ( fullyRefunded ) {
    const row = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: payment.bookingReference } );
    if ( row ) await pb().collection( pocketBaseCollections.bookings ).update( row.id, { status: "cancelled", outboundLegStatus: "", returnLegStatus: "" } );
    await cancelPaymentReminder( payment.bookingReference );
  } else if ( booking ) {
    for ( const leg of refund.legs ) {
      if ( isLegActive( booking, leg ) ) await updateBookingStatus( rideReference( booking.reference, leg ), "cancelled" );
    }
  }
  const updated = await getBookingByReference( payment.bookingReference );
  await notifyPaymentStatus( payment.id, updated );
  return updated;
}
