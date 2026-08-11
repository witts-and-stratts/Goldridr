import { NextResponse } from "next/server";
import { Resend } from "resend";
import { recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { createInboundEmailReceiver } from "@/lib/notifications/inbound-email-receiver";
import { withWebhookAudit } from "@/lib/notifications/webhook-logs";

export async function POST( request: Request ) {
  return withWebhookAudit( "resend", request, async ( { rawBody } ) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const apiKey = process.env.RESEND_API_KEY;
    if ( !secret || !apiKey ) {
      return { response: new NextResponse( "Webhook is not configured", { status: 503 } ), audit: { validationStatus: "not_configured", processingStatus: "rejected", eventType: "configuration.missing" } };
    }

    let event: { id?: string; type: string; created_at?: string; data?: { email_id?: string; id?: string; from?: string; to?: string[]; subject?: string } };
    try {
      event = new Resend( apiKey ).webhooks.verify( {
      payload: rawBody,
      headers: {
        id: request.headers.get( "svix-id" ) || "",
        timestamp: request.headers.get( "svix-timestamp" ) || "",
        signature: request.headers.get( "svix-signature" ) || "",
      },
      webhookSecret: secret,
      } ) as typeof event;
    } catch ( error ) {
      return { response: new NextResponse( "Invalid webhook signature", { status: 400 } ), audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.invalid", errorMessage: error instanceof Error ? error.message : String( error ) } };
    }

    const providerEventId = event.id || `${ event.type }:${ event.data?.email_id || event.data?.id }:${ event.created_at || "" }`;
    const providerMessageId = event.data?.email_id || event.data?.id || "";
    try {
      if ( event.type === "email.received" && event.data?.email_id ) {
        const receiver = createInboundEmailReceiver();
        if ( receiver.transport !== "resend" || !receiver.receiveResendEvent ) {
          return { response: NextResponse.json( { received: true, ignored: "Resend inbound email is not enabled" } ), audit: { validationStatus: "valid", processingStatus: "ignored", eventType: event.type, providerEventId, providerMessageId } };
        }
        const notificationId = await receiver.receiveResendEvent( event.data.email_id, {
          from: event.data.from,
          to: event.data.to,
          subject: event.data.subject,
          createdAt: event.created_at,
        } );
        return { response: NextResponse.json( { received: true, notificationId: notificationId || null } ), audit: { validationStatus: "valid", processingStatus: "processed", eventType: event.type, providerEventId, providerMessageId } };
      }
      await recordPocketBaseProviderEvent( "resend", providerEventId, providerMessageId, event.type, event );
      return { response: NextResponse.json( { received: true } ), audit: { validationStatus: "valid", processingStatus: "processed", eventType: event.type, providerEventId, providerMessageId } };
    } catch ( error ) {
      return { response: new NextResponse( "Webhook processing failed", { status: 500 } ), audit: { validationStatus: "valid", processingStatus: "failed", eventType: event.type, providerEventId, providerMessageId, errorMessage: error instanceof Error ? error.message : String( error ) } };
    }
  } );
}
