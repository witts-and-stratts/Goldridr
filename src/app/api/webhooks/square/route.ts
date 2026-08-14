import { NextResponse } from "next/server";
import { withWebhookAudit } from "@/lib/notifications/webhook-logs";
import { createPocketBaseBookingStatusUpdate, recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { refundProviderPayment, verifySquareWebhook } from "@/lib/payments/providers";
import { markPaymentFailed, markPaymentPaid, markPaymentRefunded, paymentForExternalId, updatePaymentAttempt } from "@/lib/payments/repository";
import { squarePaymentDetails } from "@/lib/payments/details";

export async function POST( request: Request ) {
  return withWebhookAudit( "square", request, async ( { rawBody, payload } ) => {
    const signature = request.headers.get( "x-square-hmacsha256-signature" ) || "";
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL?.trim() || request.url;
    if ( !signature || !await verifySquareWebhook( rawBody, signature, notificationUrl ) ) return { response: new NextResponse( "Invalid signature", { status: 403 } ), audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.invalid" } };
    const event = payload as { event_id?: string; type?: string; data?: { object?: { payment?: Record<string, unknown> } } };
    const squarePayment = event.data?.object?.payment;
    const externalId = String( squarePayment?.id || "" );
    await recordPocketBaseProviderEvent( "square", event.event_id || externalId, externalId, event.type || "unknown", payload );
    const payment = externalId ? await paymentForExternalId( "square", externalId ) : undefined;
    if ( payment && squarePayment ) {
      const status = String( squarePayment.status || "" );
      await updatePaymentAttempt( payment.id, { transactionReference: externalId } );
      const updated = ( await paymentForExternalId( "square", externalId ) )!;
      if ( status === "COMPLETED" ) {
        const result = await markPaymentPaid( updated, externalId, squarePayment, squarePaymentDetails( squarePayment ) );
        if ( result.late ) { const refund = await refundProviderPayment( updated ); await markPaymentRefunded( updated, refund ); }
        else if ( result.booking ) await createPocketBaseBookingStatusUpdate( result.booking );
      } else if ( [ "FAILED", "CANCELED" ].includes( status ) ) await markPaymentFailed( updated, `square_${ status.toLowerCase() }`, "Square did not complete the payment", squarePayment );
    }
    return { response: NextResponse.json( { received: true } ), audit: { validationStatus: "valid", processingStatus: payment ? "processed" : "ignored", eventType: event.type, providerEventId: event.event_id, providerMessageId: externalId } };
  } );
}
