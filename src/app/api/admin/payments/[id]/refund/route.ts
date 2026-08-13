import { NextResponse } from "next/server";
import z from "zod/v4";
import { getRequestSession } from "@/lib/driver-auth";
import { createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";
import { refundProviderPayment } from "@/lib/payments/providers";
import { markPaymentRefunded, paymentForId } from "@/lib/payments/repository";

const Schema = z.object( { manualConfirmed: z.boolean().optional().default( false ) } );

export async function POST( request: Request, { params }: { params: Promise<{ id: string }> } ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( session.role !== "admin" ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  const parsed = Schema.safeParse( await request.json().catch( () => ( {} ) ) );
  const id = Number( ( await params ).id );
  if ( !parsed.success || !Number.isSafeInteger( id ) ) return NextResponse.json( { success: false, error: "Invalid refund request" }, { status: 400 } );
  const payment = await paymentForId( id );
  if ( !payment || payment.status !== "paid" ) return NextResponse.json( { success: false, error: "Only paid transactions can be refunded" }, { status: 409 } );
  if ( payment.provider === "manual" && !parsed.data.manualConfirmed ) return NextResponse.json( { success: false, error: "Confirm that the Zelle refund was completed manually" }, { status: 422 } );
  const refundReference = payment.provider === "manual" ? `manual:${ Date.now() }` : await refundProviderPayment( payment );
  const booking = await markPaymentRefunded( payment, refundReference );
  if ( booking ) await createPocketBaseBookingStatusUpdate( booking );
  return NextResponse.json( { success: true, refundReference } );
}
