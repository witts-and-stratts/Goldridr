import { NextResponse } from "next/server";
import z from "zod/v4";
import { getRequestSession } from "@/lib/driver-auth";
import { createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";
import { getBookingByReference, updateBookingStatus } from "@/lib/pocketbase/repository";
import { expirePaymentHolds, markPaymentFailed, markPaymentPaid, paymentForId } from "@/lib/payments/repository";

const Schema = z.object( { action: z.enum( [ "approve", "reject" ] ), reason: z.string().trim().max( 500 ).optional() } );

export async function POST( request: Request, { params }: { params: Promise<{ id: string }> } ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( session.role !== "admin" ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  const parsed = Schema.safeParse( await request.json() );
  const id = Number( ( await params ).id );
  if ( !parsed.success || !Number.isSafeInteger( id ) ) return NextResponse.json( { success: false, error: "Invalid verification request" }, { status: 400 } );
  await expirePaymentHolds();
  const payment = await paymentForId( id );
  if ( !payment || payment.provider !== "manual" || payment.status !== "awaiting_verification" ) return NextResponse.json( { success: false, error: "Zelle payment is not awaiting verification" }, { status: 409 } );

  if ( parsed.data.action === "approve" ) {
    const result = await markPaymentPaid( payment, payment.confirmationReference || "zelle-verified", { verifiedBy: session.userId } );
    if ( result.late ) return NextResponse.json( { success: false, error: "The slot is no longer available; refund the customer manually" }, { status: 409 } );
    if ( result.booking ) await createPocketBaseBookingStatusUpdate( result.booking );
  } else {
    await markPaymentFailed( payment, "zelle_rejected", parsed.data.reason || "Zelle payment could not be verified" );
    await updateBookingStatus( payment.bookingReference, "payment_expired" );
    const booking = await getBookingByReference( payment.bookingReference );
    if ( booking ) await createPocketBaseBookingStatusUpdate( booking );
  }
  return NextResponse.json( { success: true } );
}
