import { NextResponse } from "next/server";
import z from "zod/v4";
import { getRequestSession } from "@/lib/driver-auth";
import { legChargeCents, rideView } from "@/lib/booking-legs";
import { getBookingByReference } from "@/lib/pocketbase/repository";
import { createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";
import { refundProviderPayment } from "@/lib/payments/providers";
import { isRefundable, markPaymentRefunded, paymentForId } from "@/lib/payments/repository";

const Schema = z.object( {
  manualConfirmed: z.boolean().optional().default( false ),
  // Legs to cancel with this refund. Omit both legs and amount for a full refund.
  legs: z.array( z.enum( [ "outbound", "return" ] ) ).max( 2 ).optional().default( [] ),
  amountCents: z.number().int().positive().optional(),
} );

export async function POST( request: Request, { params }: { params: Promise<{ id: string }> } ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( session.role !== "admin" ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  const parsed = Schema.safeParse( await request.json().catch( () => ( {} ) ) );
  const id = Number( ( await params ).id );
  if ( !parsed.success || !Number.isSafeInteger( id ) ) return NextResponse.json( { success: false, error: "Invalid refund request" }, { status: 400 } );
  const payment = await paymentForId( id );
  if ( !payment || !isRefundable( payment ) ) return NextResponse.json( { success: false, error: "Only paid transactions with a remaining balance can be refunded" }, { status: 409 } );
  if ( payment.provider === "manual" && !parsed.data.manualConfirmed ) return NextResponse.json( { success: false, error: "Confirm that the Zelle refund was completed manually" }, { status: 422 } );

  const booking = await getBookingByReference( payment.bookingReference );
  const legs = [ ...new Set( parsed.data.legs ) ];
  if ( legs.includes( "return" ) && !booking?.returnLeg ) return NextResponse.json( { success: false, error: "This booking has no return leg" }, { status: 422 } );
  const remainingCents = payment.amountCents - payment.refundedCents;
  const defaultCents = legs.length && booking ? legChargeCents( booking, legs ) : remainingCents;
  const amountCents = parsed.data.amountCents ?? Math.min( defaultCents, remainingCents );
  if ( amountCents <= 0 || amountCents > remainingCents ) {
    return NextResponse.json( { success: false, error: `Refund must be between $0.01 and ${ ( remainingCents / 100 ).toFixed( 2 ) }` }, { status: 422 } );
  }

  const refundReference = payment.provider === "manual" ? `manual:${ Date.now() }` : await refundProviderPayment( payment, amountCents );
  const updated = await markPaymentRefunded( payment, refundReference, { amountCents, legs } );
  if ( updated ) {
    // A leg refund leaves the booking active, so tell the customer about the leg that was cancelled.
    const notices = updated.status === "cancelled" || !legs.length ? [ updated ] : legs.map( leg => rideView( updated, leg ) );
    for ( const notice of notices ) if ( notice ) await createPocketBaseBookingStatusUpdate( notice );
  }
  return NextResponse.json( { success: true, refundReference, amountCents } );
}
