import { NextResponse } from "next/server";
import { recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { verifySnsMessage, type SnsMessage } from "@/lib/notifications/sns";
import { withWebhookAudit } from "@/lib/notifications/webhook-logs";

export async function POST( request: Request ) {
  return withWebhookAudit( "ses", request, async ( { rawBody } ) => {
    let envelope: SnsMessage;
    try {
      envelope = JSON.parse( rawBody ) as SnsMessage;
    } catch ( error ) {
      return { response: new NextResponse( "Invalid SNS payload", { status: 400 } ), audit: { validationStatus: "not_applicable", processingStatus: "rejected", eventType: "payload.invalid", errorMessage: error instanceof Error ? error.message : String( error ) } };
    }
    if ( !( await verifySnsMessage( envelope ) ) ) {
      return { response: new NextResponse( "Invalid SNS signature", { status: 400 } ), audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.invalid", providerEventId: envelope.MessageId } };
    }
    if ( envelope.Type !== "Notification" ) {
      return { response: NextResponse.json( { received: true, type: envelope.Type } ), audit: { validationStatus: "valid", processingStatus: "ignored", eventType: `sns.${ envelope.Type || "unknown" }`, providerEventId: envelope.MessageId } };
    }
    try {
      const event = JSON.parse( envelope.Message ) as {
        eventType?: string;
        notificationType?: string;
        mail?: { messageId?: string };
      };
      const eventType = event.eventType || event.notificationType || "unknown";
      await recordPocketBaseProviderEvent( "ses_api", envelope.MessageId, event.mail?.messageId, eventType, event );
      return { response: NextResponse.json( { received: true } ), audit: { validationStatus: "valid", processingStatus: "processed", eventType, providerEventId: envelope.MessageId, providerMessageId: event.mail?.messageId } };
    } catch ( error ) {
      return { response: new NextResponse( "Invalid SES event", { status: 400 } ), audit: { validationStatus: "valid", processingStatus: "failed", eventType: "payload.invalid", providerEventId: envelope.MessageId, errorMessage: error instanceof Error ? error.message : String( error ) } };
    }
  } );
}
