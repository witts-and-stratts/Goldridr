import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import twilio from "twilio";
import {
  classifyInboundKeyword,
  restoreSmsConsent,
  revokeSmsConsent,
} from "@/lib/notifications/sms-consent";
import { resolveTwilioWebhookUrl } from "@/lib/notifications/sms-program";
import { recordInboundSms } from "@/lib/notifications/inbound-sms";
import { withWebhookAudit } from "@/lib/notifications/webhook-logs";
import { recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import {
  SMS_HELP_REPLY,
  SMS_OPT_IN_REPLY,
  SMS_OPT_OUT_REPLY,
} from "@/lib/sms-consent-copy";

// Twilio's Advanced Opt-Out already sends the carrier-mandated STOP/HELP replies, so
// this endpoint stays silent by default and only syncs our own consent state. Set
// TWILIO_INBOUND_AUTO_REPLY=true when Advanced Opt-Out is disabled on the messaging
// service, otherwise the passenger receives two replies.
const AUTO_REPLY = process.env.TWILIO_INBOUND_AUTO_REPLY === "true";

function twiml( message?: string ): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${ message.replace( /&/g, "&amp;" ).replace( /</g, "&lt;" ) }</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse( body, { status: 200, headers: { "Content-Type": "text/xml" } } );
}

export async function POST( request: Request ) {
  return withWebhookAudit( "twilio", request, async ( { rawBody } ) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const signature = request.headers.get( "x-twilio-signature" );
    const params = Object.fromEntries( new URLSearchParams( rawBody ) );
    const eventId = String( params.MessageSid || "" ) || `inbound:${ randomUUID() }`;
    const messageId = String( params.MessageSid || "" );

    if ( authToken ) {
      if ( !signature || !twilio.validateRequest( authToken, signature, resolveTwilioWebhookUrl( request, process.env.TWILIO_WEBHOOK_URL ), params ) ) {
        return {
          response: new NextResponse( "Invalid Twilio signature", { status: 403 } ),
          audit: { validationStatus: "invalid", processingStatus: "rejected", eventType: "signature.invalid", providerEventId: eventId, providerMessageId: messageId },
        };
      }
    } else if ( process.env.NODE_ENV === "production" ) {
      return {
        response: new NextResponse( "Twilio is not configured", { status: 503 } ),
        audit: { validationStatus: "not_configured", processingStatus: "rejected", eventType: "configuration.missing", providerEventId: eventId, providerMessageId: messageId },
      };
    }

    const validationStatus = authToken ? "valid" as const : "not_applicable" as const;
    const from = String( params.From || "" );
    const to = String( params.To || "" );
    const body = String( params.Body || "" );
    const action = classifyInboundKeyword( body );

    if ( !from ) {
      return {
        response: twiml(),
        audit: { validationStatus, processingStatus: "ignored", eventType: "sms.missing_sender", providerEventId: eventId, providerMessageId: messageId },
      };
    }

    try {
      if ( action === "opt_out" ) {
        const result = await revokeSmsConsent( from );
        await recordPocketBaseProviderEvent( "twilio", eventId, messageId, "sms.opt_out", { from, to, body, ...result } );
        return { response: twiml( AUTO_REPLY ? SMS_OPT_OUT_REPLY : undefined ), audit: { validationStatus, processingStatus: "processed", eventType: "sms.opt_out", providerEventId: eventId, providerMessageId: messageId } };
      }
      if ( action === "opt_in" ) {
        const result = await restoreSmsConsent( from );
        await recordPocketBaseProviderEvent( "twilio", eventId, messageId, "sms.opt_in", { from, to, body, ...result } );
        return { response: twiml( AUTO_REPLY && result.ledgerRestored > 0 ? SMS_OPT_IN_REPLY : undefined ), audit: { validationStatus, processingStatus: "processed", eventType: "sms.opt_in", providerEventId: eventId, providerMessageId: messageId } };
      }
      if ( action === "help" ) {
        await recordPocketBaseProviderEvent( "twilio", eventId, messageId, "sms.help", { from, to, body } );
        return { response: twiml( AUTO_REPLY ? SMS_HELP_REPLY : undefined ), audit: { validationStatus, processingStatus: "processed", eventType: "sms.help", providerEventId: eventId, providerMessageId: messageId } };
      }
      await recordInboundSms( { providerMessageId: eventId, from, to, body, params } );
      await recordPocketBaseProviderEvent( "twilio", eventId, messageId, "sms.inbound", { from, to, body, numMedia: Number( params.NumMedia || 0 ) } );
      return { response: twiml(), audit: { validationStatus, processingStatus: "processed", eventType: "sms.inbound", providerEventId: eventId, providerMessageId: messageId } };
    } catch ( error ) {
      console.error( "Twilio inbound webhook error:", error );
      return {
        response: twiml(),
        audit: {
          validationStatus,
          processingStatus: "failed",
          eventType: action === "unknown" ? "sms.inbound" : `sms.${ action }`,
          providerEventId: eventId,
          providerMessageId: messageId,
          errorMessage: error instanceof Error ? error.message : String( error ),
        },
      };
    }
  } );
}
