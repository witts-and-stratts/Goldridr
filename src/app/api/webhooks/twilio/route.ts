import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import twilio from "twilio";
import {
  classifyInboundKeyword,
  restoreSmsConsent,
  revokeSmsConsent,
} from "@/lib/notifications/sms-consent";
import { recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";

// Twilio's Advanced Opt-Out already sends the carrier-mandated STOP/HELP replies, so
// this endpoint stays silent by default and only syncs our own consent state. Set
// TWILIO_INBOUND_AUTO_REPLY=true when Advanced Opt-Out is disabled on the messaging
// service, otherwise the passenger receives two replies.
const AUTO_REPLY = process.env.TWILIO_INBOUND_AUTO_REPLY === "true";

const HELP_REPLY = "Goldridr ride notifications. Msg frequency varies, up to 6 msgs per booking. Msg & data rates may apply. Reply STOP to cancel. Support: concierge@goldridr.com";
const OPT_OUT_REPLY = "You have been unsubscribed from Goldridr messages. No further messages will be sent. Reply START to resubscribe.";
const OPT_IN_REPLY = "You are resubscribed to Goldridr booking updates. Msg frequency varies, up to 6 msgs per booking. Msg & data rates may apply. Reply HELP for help, STOP to cancel.";

function twiml( message?: string ): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${ message.replace( /&/g, "&amp;" ).replace( /</g, "&lt;" ) }</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse( body, { status: 200, headers: { "Content-Type": "text/xml" } } );
}

function webhookUrl( request: Request ): string {
  const configured = process.env.TWILIO_WEBHOOK_URL?.trim();
  if ( configured ) return configured;
  const forwardedProto = request.headers.get( "x-forwarded-proto" );
  const forwardedHost = request.headers.get( "x-forwarded-host" );
  if ( forwardedProto && forwardedHost ) {
    return `${ forwardedProto }://${ forwardedHost }${ new URL( request.url ).pathname }`;
  }
  return request.url;
}

export async function POST( request: Request ) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get( "x-twilio-signature" );
  const raw = await request.text();
  const params = Object.fromEntries( new URLSearchParams( raw ) );

  // Unsigned requests are only tolerated when Twilio is not configured at all, which is
  // the mock transport used in local development and tests.
  if ( authToken ) {
    if ( !signature || !twilio.validateRequest( authToken, signature, webhookUrl( request ), params ) ) {
      return new NextResponse( "Invalid Twilio signature", { status: 403 } );
    }
  } else if ( process.env.NODE_ENV === "production" ) {
    return new NextResponse( "Twilio is not configured", { status: 503 } );
  }

  const from = String( params.From || "" );
  const body = String( params.Body || "" );
  const action = classifyInboundKeyword( body );
  const eventId = String( params.MessageSid || "" ) || `inbound:${ randomUUID() }`;

  if ( !from ) return twiml();

  try {
    if ( action === "opt_out" ) {
      const result = await revokeSmsConsent( from );
      await recordPocketBaseProviderEvent( "twilio", eventId, undefined, "sms.opt_out", { from, body, ...result } );
      return twiml( AUTO_REPLY ? OPT_OUT_REPLY : undefined );
    }
    if ( action === "opt_in" ) {
      const result = await restoreSmsConsent( from );
      await recordPocketBaseProviderEvent( "twilio", eventId, undefined, "sms.opt_in", { from, body, ...result } );
      return twiml( AUTO_REPLY && result.ledgerRestored > 0 ? OPT_IN_REPLY : undefined );
    }
    if ( action === "help" ) {
      await recordPocketBaseProviderEvent( "twilio", eventId, undefined, "sms.help", { from, body } );
      return twiml( AUTO_REPLY ? HELP_REPLY : undefined );
    }
    await recordPocketBaseProviderEvent( "twilio", eventId, undefined, "sms.inbound", { from, body } );
    return twiml();
  } catch ( error ) {
    console.error( "Twilio inbound webhook error:", error );
    // Never 500 back to Twilio for a STOP; the carrier-level opt-out has already taken
    // effect and a non-200 only triggers retries.
    return twiml();
  }
}
