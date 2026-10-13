// A round trip is one booking with two legs. The booking's own schedule fields
// are the outbound leg and `returnLeg` holds the return. Scheduling, dispatch
// and the driver app work with rides: one per leg, each with its own reference
// (the return ride is the booking reference plus `-R`). Payments, invoices and
// refunds always use the booking reference.
import type { BookingRecord, ReturnLegRecord } from "@/lib/pocketbase/repository";

export type BookingLeg = "outbound" | "return";

export const RETURN_RIDE_SUFFIX = "-R";

// Statuses that belong to the payment lifecycle apply to the whole booking.
export const AWAITING_PAYMENT_STATUSES = [ "pending_payment", "payment_review", "payment_expired" ];

const INACTIVE_LEG_STATUSES = [ "cancelled", "rejected", "payment_expired" ];

export function rideReference( bookingReference: string, leg: BookingLeg ): string {
  return leg === "return" ? `${ bookingReference }${ RETURN_RIDE_SUFFIX }` : bookingReference;
}

export function parseRideReference( reference: string ): { bookingReference: string; leg: BookingLeg } {
  const value = reference.trim().toUpperCase();
  return value.endsWith( RETURN_RIDE_SUFFIX )
    ? { bookingReference: value.slice( 0, -RETURN_RIDE_SUFFIX.length ), leg: "return" }
    : { bookingReference: value, leg: "outbound" };
}

export function isRoundTrip( booking: Pick<BookingRecord, "returnLeg"> ): boolean {
  return Boolean( booking.returnLeg );
}

export function legStatus( booking: BookingRecord, leg: BookingLeg ): string {
  const override = leg === "return" ? booking.returnLeg?.status : booking.outboundStatus;
  return override || booking.status;
}

export function isLegActive( booking: BookingRecord, leg: BookingLeg ): boolean {
  return !INACTIVE_LEG_STATUSES.includes( legStatus( booking, leg ) );
}

function withRoundTripLink( tripDetails: string, link: Record<string, unknown> ): string {
  try {
    const details = JSON.parse( tripDetails || "{}" ) as Record<string, unknown>;
    const current = details.roundTrip && typeof details.roundTrip === "object" ? details.roundTrip as Record<string, unknown> : {};
    return JSON.stringify( { ...details, roundTrip: { ...current, ...link } } );
  } catch {
    return tripDetails;
  }
}

/** The booking seen as a single leg: that leg's schedule, chauffeur, details and status. */
export function rideView( booking: BookingRecord, leg: BookingLeg ): BookingRecord | undefined {
  const bookingReference = booking.bookingReference || booking.reference;
  if ( leg === "outbound" ) {
    return {
      ...booking,
      reference: bookingReference,
      bookingReference,
      leg: booking.returnLeg ? "outbound" : undefined,
      status: legStatus( booking, "outbound" ),
      tripDetails: booking.returnLeg
        ? withRoundTripLink( booking.tripDetails, { leg: "outbound", pairedReference: rideReference( bookingReference, "return" ) } )
        : booking.tripDetails,
    };
  }
  const returnLeg: ReturnLegRecord | null | undefined = booking.returnLeg;
  if ( !returnLeg ) return undefined;
  return {
    ...booking,
    reference: rideReference( bookingReference, "return" ),
    bookingReference,
    leg: "return",
    date: returnLeg.date,
    time: returnLeg.time,
    duration: returnLeg.duration,
    chauffeurId: returnLeg.chauffeurId,
    tripDetails: withRoundTripLink( returnLeg.tripDetails, { leg: "return", pairedReference: bookingReference } ),
    status: legStatus( booking, "return" ),
    pinConfirmedAt: returnLeg.pinConfirmedAt,
  };
}

export function rideViews( booking: BookingRecord ): BookingRecord[] {
  return [ rideView( booking, "outbound" ), rideView( booking, "return" ) ].filter( ( ride ): ride is BookingRecord => Boolean( ride ) );
}

export interface LegCharge {
  leg: BookingLeg;
  listCents: number;
  discountCents: number;
  chargedCents: number;
}

export interface BookingCharges {
  legs: LegCharge[];
  subtotalCents: number;
  roundTripDiscountPercent: number;
  roundTripDiscountCents: number;
  codeDiscountCents: number;
  /** Difference left by an admin price override; negative when the override is below the list price. */
  adjustmentCents: number;
  totalCents: number;
}

function details( booking: BookingRecord ): Record<string, unknown> {
  try {
    const value = JSON.parse( booking.tripDetails || "{}" );
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

const cents = ( value: unknown ) => Number.isFinite( Number( value ) ) ? Math.max( 0, Math.round( Number( value ) ) ) : 0;

/**
 * Splits what the customer was charged across the legs. Every discount on the
 * booking (round trip and discount code) is shared in proportion to each leg's
 * price, and the last leg absorbs rounding so the legs always add up to the total.
 */
export function bookingCharges( booking: BookingRecord ): BookingCharges {
  const totalCents = cents( booking.quoteTotalCents );
  const codeDiscountCents = cents( booking.quoteDiscountCents );
  const link = details( booking ).roundTrip as Record<string, unknown> | undefined;
  const outboundCents = cents( link?.outboundCents );
  const returnCents = cents( link?.returnCents );
  const roundTripDiscountCents = cents( link?.discountCents );
  const roundTripDiscountPercent = Number( link?.discountPercent ) || 0;

  if ( !booking.returnLeg || outboundCents + returnCents <= 0 ) {
    const listCents = totalCents + codeDiscountCents;
    return {
      legs: [ { leg: "outbound", listCents, discountCents: codeDiscountCents, chargedCents: totalCents } ],
      subtotalCents: listCents,
      roundTripDiscountPercent: 0,
      roundTripDiscountCents: 0,
      codeDiscountCents,
      adjustmentCents: 0,
      totalCents,
    };
  }

  const subtotalCents = outboundCents + returnCents;
  const outboundCharged = Math.round( totalCents * outboundCents / subtotalCents );
  const legs: LegCharge[] = [
    { leg: "outbound", listCents: outboundCents, discountCents: outboundCents - outboundCharged, chargedCents: outboundCharged },
    { leg: "return", listCents: returnCents, discountCents: returnCents - ( totalCents - outboundCharged ), chargedCents: totalCents - outboundCharged },
  ];
  const adjustmentCents = totalCents - ( subtotalCents - roundTripDiscountCents - codeDiscountCents );
  return { legs, subtotalCents, roundTripDiscountPercent, roundTripDiscountCents, codeDiscountCents, adjustmentCents, totalCents };
}

export function legChargeCents( booking: BookingRecord, legs: BookingLeg[] ): number {
  return bookingCharges( booking ).legs
    .filter( item => legs.includes( item.leg ) )
    .reduce( ( sum, item ) => sum + item.chargedCents, 0 );
}

export function legLabel( leg: BookingLeg ): string {
  return leg === "return" ? "Return" : "Outbound";
}
