import "server-only";
import { randomUUID } from "crypto";
import type { RecordModel } from "pocketbase";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { createWithLegacyId, first } from "@/lib/pocketbase/core";
import { checkBookingClash, getBookingByReference, type BookingRecord } from "@/lib/pocketbase/repository";
import { getPaymentSettings } from "@/lib/admin-settings";
import { paymentTokenHash } from "./tokens";
import type { PaymentAttempt, PaymentMethod, PaymentProvider, PaymentStatus } from "./types";
import { cancelPaymentReminder } from "./hold-expiry";
import { createPocketBasePaymentStatusUpdate } from "@/lib/pocketbase/notifications";

export { cancelPaymentReminder, expirePaymentHolds } from "./hold-expiry";

const pb = () => getPocketBaseClient();
const text = ( value: unknown ) => value ? String( value ) : null;

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
    paidAt: text( row.paidAt ),
    refundedAt: text( row.refundedAt ),
  };
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

export async function markPaymentPaid( payment: PaymentAttempt, transactionReference?: string, metadata?: unknown ): Promise<{ booking?: BookingRecord; late: boolean }> {
  if ( payment.status === "paid" ) return { booking: await getBookingByReference( payment.bookingReference ), late: false };
  const booking = await getBookingByReference( payment.bookingReference );
  if ( !booking ) throw new Error( "Booking not found" );
  const terminal = [ "cancelled", "rejected" ].includes( booking.status );
  const expired = booking.status === "payment_expired" || Boolean( booking.holdExpiresAt && new Date( booking.holdExpiresAt ).getTime() <= Date.now() );
  const clash = expired && booking.chauffeurId ? ( await checkBookingClash( booking.date, booking.time, booking.duration, booking.chauffeurId ) ).clash : false;
  if ( terminal || clash ) return { booking, late: true };

  const now = new Date().toISOString();
  await updatePaymentAttempt( payment.id, { status: "paid", transactionReference: transactionReference || payment.transactionReference || "", paidAt: now, providerMetadata: metadata || {} } );
  const row = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: booking.reference } );
  if ( row ) await pb().collection( pocketBaseCollections.bookings ).update( row.id, { status: "confirmed", paymentConfirmedAt: now } );
  await cancelPaymentReminder( booking.reference );
  const updatedBooking = await getBookingByReference( booking.reference );
  await notifyPaymentStatus( payment.id, updatedBooking );
  return { booking: updatedBooking, late: false };
}

export async function markPaymentFailed( payment: PaymentAttempt, code: string, message: string, metadata?: unknown ): Promise<void> {
  if ( [ "paid", "refunded" ].includes( payment.status ) ) return;
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

export async function markPaymentRefunded( payment: PaymentAttempt, refundReference: string ): Promise<BookingRecord | undefined> {
  const now = new Date().toISOString();
  await updatePaymentAttempt( payment.id, { status: "refunded", refundedAt: now, providerMetadata: { refundReference } } );
  const row = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: payment.bookingReference } );
  if ( row ) await pb().collection( pocketBaseCollections.bookings ).update( row.id, { status: "cancelled" } );
  await cancelPaymentReminder( payment.bookingReference );
  const booking = await getBookingByReference( payment.bookingReference );
  await notifyPaymentStatus( payment.id, booking );
  return booking;
}
