import { NextResponse } from "next/server";
import { withWebhookAudit } from "@/lib/notifications/webhook-logs";
import { createPocketBaseBookingStatusUpdate, recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { refundProviderPayment, verifyPayPalWebhook } from "@/lib/payments/providers";
import { markPaymentFailed, markPaymentPaid, markPaymentRefunded, paymentForExternalId, updatePaymentAttempt } from "@/lib/payments/repository";

export async function POST( request: Request ) {
  return withWebhookAudit( "paypal", request, async ( { payload } ) => {
    if ( !await verifyPayPalWebhook( request.headers, payload ) ) return { response: new NextResponse( "Invalid signature", { status: 403 } ), audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.invalid" } };
    const event = payload as { id?: string; event_type?: string; resource?: Record<string, unknown> & { supplementary_data?: { related_ids?: { order_id?: string } } } };
    const orderId = event.resource?.supplementary_data?.related_ids?.order_id || "";
    const captureId = String( event.resource?.id || "" );
    await recordPocketBaseProviderEvent( "paypal", event.id || captureId, captureId, event.event_type || "unknown", payload );
    const payment = orderId ? await paymentForExternalId( "paypal", orderId ) : undefined;
    if ( payment && event.event_type === "PAYMENT.CAPTURE.COMPLETED" ) {
      await updatePaymentAttempt( payment.id, { transactionReference: captureId } );
      const updated = ( await paymentForExternalId( "paypal", orderId ) )!;
      const result = await markPaymentPaid( updated, captureId, event.resource );
      if ( result.late ) { const refund = await refundProviderPayment( updated ); await markPaymentRefunded( updated, refund ); }
      else if ( result.booking ) await createPocketBaseBookingStatusUpdate( result.booking );
    } else if ( payment && [ "PAYMENT.CAPTURE.DENIED", "CHECKOUT.PAYMENT-APPROVAL.REVERSED" ].includes( event.event_type || "" ) ) {
      await markPaymentFailed( payment, "paypal_payment_failed", "PayPal did not complete the payment", event.resource );
    }
    return { response: NextResponse.json( { received: true } ), audit: { validationStatus: "valid", processingStatus: payment ? "processed" : "ignored", eventType: event.event_type, providerEventId: event.id, providerMessageId: captureId } };
  } );
}
