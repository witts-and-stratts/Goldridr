import { NextResponse } from "next/server";
import z from "zod/v4";
import { findBookingByPaymentToken, submitZelleClaim } from "@/lib/payments/repository";

const Schema = z.object( { senderName: z.string().trim().min( 2 ).max( 200 ), confirmationReference: z.string().trim().min( 2 ).max( 255 ) } );

export async function POST( request: Request, { params }: { params: Promise<{ token: string }> } ) {
  const parsed = Schema.safeParse( await request.json() );
  if ( !parsed.success ) return NextResponse.json( { success: false, error: "Sender name and confirmation reference are required" }, { status: 400 } );
  const booking = await findBookingByPaymentToken( ( await params ).token );
  if ( !booking ) return NextResponse.json( { success: false, error: "Payment link not found" }, { status: 404 } );
  if ( booking.status !== "pending_payment" || !booking.holdExpiresAt || new Date( booking.holdExpiresAt ).getTime() <= Date.now() ) return NextResponse.json( { success: false, error: "This payment hold has expired" }, { status: 410 } );
  await submitZelleClaim( booking, parsed.data.senderName, parsed.data.confirmationReference );
  return NextResponse.json( { success: true, status: "payment_review" } );
}
