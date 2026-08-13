import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { withWebhookAudit } from "@/lib/notifications/webhook-logs";
import { createPocketBaseBookingStatusUpdate, recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { constructStripeEvent, refundProviderPayment } from "@/lib/payments/providers";
import { markPaymentFailed, markPaymentPaid, markPaymentRefunded, paymentForId, updatePaymentAttempt } from "@/lib/payments/repository";

export async function POST( request: Request ) {
  return withWebhookAudit( "stripe", request, async ( { rawBody } ) => {
    const signature = request.headers.get( "stripe-signature" );
    if ( !signature ) return { response: new NextResponse( "Missing signature", { status: 400 } ), audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.missing" } };
    let event: Stripe.Event;
    try { event = await constructStripeEvent( rawBody, signature ); }
    catch { return { response: new NextResponse( "Invalid signature", { status: 400 } ), audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.invalid" } }; }

    await recordPocketBaseProviderEvent( "stripe", event.id, undefined, event.type, event.data.object );
    if ( event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = Number( session.metadata?.paymentId || 0 );
      const payment = await paymentForId( paymentId );
      if ( payment ) {
        const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
        await updatePaymentAttempt( payment.id, { externalId: session.id, transactionReference: paymentIntent } );
        const updated = ( await paymentForId( payment.id ) )!;
        const result = await markPaymentPaid( updated, paymentIntent, session );
        if ( result.late ) {
          const refundReference = await refundProviderPayment( updated );
          await markPaymentRefunded( updated, refundReference );
        } else if ( result.booking ) await createPocketBaseBookingStatusUpdate( result.booking );
      }
    } else if ( event.type === "checkout.session.async_payment_failed" ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const payment = await paymentForId( Number( session.metadata?.paymentId || 0 ) );
      if ( payment ) await markPaymentFailed( payment, "stripe_payment_failed", "Stripe reported that the payment failed", session );
    }
    return { response: NextResponse.json( { received: true } ), audit: { validationStatus: "valid", processingStatus: "processed", eventType: event.type, providerEventId: event.id } };
  } );
}
