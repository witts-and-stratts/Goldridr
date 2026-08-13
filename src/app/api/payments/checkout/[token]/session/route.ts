import { NextResponse } from "next/server";
import z from "zod/v4";
import { getPaymentSettings } from "@/lib/admin-settings";
import { createPaymentAttempt, findBookingByPaymentToken, updatePaymentAttempt } from "@/lib/payments/repository";
import { createPayPalOrder, createStripeCheckout } from "@/lib/payments/providers";

const Schema = z.object( { method: z.enum( [ "card", "apple_pay", "cash_app", "venmo" ] ) } );

export async function POST( request: Request, { params }: { params: Promise<{ token: string }> } ) {
  const parsed = Schema.safeParse( await request.json() );
  if ( !parsed.success ) return NextResponse.json( { success: false, error: "Invalid payment method" }, { status: 400 } );
  const { token } = await params;
  const booking = await findBookingByPaymentToken( token );
  if ( !booking ) return NextResponse.json( { success: false, error: "Payment link not found" }, { status: 404 } );
  if ( booking.status !== "pending_payment" || !booking.holdExpiresAt || new Date( booking.holdExpiresAt ).getTime() <= Date.now() ) return NextResponse.json( { success: false, error: "This payment hold has expired" }, { status: 410 } );
  const settings = await getPaymentSettings();
  if ( !settings.enabledMethods.includes( parsed.data.method ) ) return NextResponse.json( { success: false, error: "Payment method is unavailable" }, { status: 422 } );

  if ( parsed.data.method === "venmo" ) {
    const payment = await createPaymentAttempt( { booking, method: "venmo", provider: "paypal" } );
    const order = await createPayPalOrder( payment, booking );
    await updatePaymentAttempt( payment.id, { externalId: order.externalId } );
    return NextResponse.json( { success: true, provider: "paypal", orderId: order.externalId } );
  }

  if ( settings.activeProcessor === "square" ) return NextResponse.json( { success: true, provider: "square" } );
  const payment = await createPaymentAttempt( { booking, method: parsed.data.method, provider: "stripe" } );
  const paymentPageUrl = `${ new URL( request.url ).origin }/pay/${ encodeURIComponent( token ) }`;
  const session = await createStripeCheckout( payment, booking, parsed.data.method, paymentPageUrl );
  await updatePaymentAttempt( payment.id, { externalId: session.externalId } );
  return NextResponse.json( { success: true, provider: "stripe", redirectUrl: session.url } );
}
