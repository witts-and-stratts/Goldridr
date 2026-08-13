import { NextResponse } from "next/server";
import z from "zod/v4";
import { getPaymentSettings } from "@/lib/admin-settings";
import { createPaymentAttempt, findBookingByPaymentToken, updatePaymentAttempt } from "@/lib/payments/repository";
import { createSquarePayment } from "@/lib/payments/providers";

const Schema = z.object( { method: z.enum( [ "card", "apple_pay", "cash_app" ] ), sourceId: z.string().min( 1 ).max( 2000 ) } );

export async function POST( request: Request, { params }: { params: Promise<{ token: string }> } ) {
  const parsed = Schema.safeParse( await request.json() );
  if ( !parsed.success ) return NextResponse.json( { success: false, error: "Invalid Square payment" }, { status: 400 } );
  const settings = await getPaymentSettings();
  if ( settings.activeProcessor !== "square" ) return NextResponse.json( { success: false, error: "Square is not active" }, { status: 409 } );
  if ( !settings.enabledMethods.includes( parsed.data.method ) ) return NextResponse.json( { success: false, error: "Payment method is unavailable" }, { status: 422 } );
  const booking = await findBookingByPaymentToken( ( await params ).token );
  if ( !booking ) return NextResponse.json( { success: false, error: "Payment link not found" }, { status: 404 } );
  if ( booking.status !== "pending_payment" || !booking.holdExpiresAt || new Date( booking.holdExpiresAt ).getTime() <= Date.now() ) return NextResponse.json( { success: false, error: "This payment hold has expired" }, { status: 410 } );
  const payment = await createPaymentAttempt( { booking, method: parsed.data.method, provider: "square" } );
  const result = await createSquarePayment( payment, booking, parsed.data.sourceId );
  await updatePaymentAttempt( payment.id, { externalId: result.externalId, transactionReference: result.externalId } );
  return NextResponse.json( { success: true, processing: true } );
}
