import { NextResponse } from "next/server";
import z from "zod/v4";
import { findBookingByPaymentToken, paymentForExternalId } from "@/lib/payments/repository";
import { capturePayPalOrder } from "@/lib/payments/providers";

const Schema = z.object( { orderId: z.string().min( 1 ).max( 200 ) } );

export async function POST( request: Request, { params }: { params: Promise<{ token: string }> } ) {
  const parsed = Schema.safeParse( await request.json() );
  if ( !parsed.success ) return NextResponse.json( { success: false, error: "Invalid PayPal order" }, { status: 400 } );
  const booking = await findBookingByPaymentToken( ( await params ).token );
  if ( !booking ) return NextResponse.json( { success: false, error: "Payment link not found" }, { status: 404 } );
  const payment = await paymentForExternalId( "paypal", parsed.data.orderId );
  if ( !payment || payment.bookingReference !== booking.reference ) return NextResponse.json( { success: false, error: "Payment attempt not found" }, { status: 404 } );
  await capturePayPalOrder( parsed.data.orderId, payment.idempotencyKey || String( payment.id ) );
  return NextResponse.json( { success: true, processing: true } );
}
