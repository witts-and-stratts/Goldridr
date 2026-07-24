import { getAllBookings, type BookingRecord } from "@/lib/pocketbase/repository";
import { createPocketBaseInboundEmail, recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { first } from "@/lib/pocketbase/core";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";

export interface InboundEmail {
  provider: "mailpit" | "webmail_imap" | "resend";
  providerMessageId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  receivedAt?: string;
  messageId?: string;
  inReplyTo?: string;
}

function normalizedEmail( value: string ): string {
  const match = value.match( /<([^>]+)>/ );
  return ( match?.[ 1 ] || value ).trim().toLowerCase();
}

export function extractReplyText( value: string, subject: string ): string {
  const body = value
    .replace( /[\p{Cf}\u00ad]/gu, "" )
    .replace( /\r\n/g, "\n" )
    .replace( /\n{3,}/g, "\n\n" )
    .trim();
  const quotedReply = /\n(?:On .+?wrote:|-----Original Message-----|From:\s.+?\nSent:\s)/i;
  const reply = body.split( quotedReply, 1 )[ 0 ]?.trim();
  return reply || subject || "(No message body)";
}

async function bookingForSender( sender: string ): Promise<BookingRecord | undefined> {
  const email = normalizedEmail( sender );
  if ( !email ) return undefined;
  return ( await getAllBookings() ).find( booking => normalizedEmail( booking.email ) === email );
}

export async function recordInboundEmail( input: InboundEmail ): Promise<{ created: boolean; notificationId?: number }> {
  const providerEvent = await first(
    pocketBaseCollections.providerEvents,
    "provider = {:provider} && providerEventId = {:eventId}",
    { provider: input.provider, eventId: input.providerMessageId }
  );
  if ( providerEvent ) return { created: false };

  const sender = normalizedEmail( input.from );
  const booking = await bookingForSender( sender );
  const eventKey = `message.inbound_email:${ input.provider }:${ input.providerMessageId }`;
  try {
    const notificationId = await createPocketBaseInboundEmail( {
      eventKey,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      sender,
      recipient: normalizedEmail( input.to ),
      subject: input.subject.trim(),
      body: extractReplyText( input.text, input.subject ),
      receivedAt: input.receivedAt,
      messageId: input.messageId,
      inReplyTo: input.inReplyTo,
      booking,
    } );
    await recordPocketBaseProviderEvent(
      input.provider,
      input.providerMessageId,
      input.messageId || input.providerMessageId,
      "email.received",
      { from: sender, to: input.to, subject: input.subject, bookingReference: booking?.reference || null }
    );
    return { created: true, notificationId };
  } catch ( error ) {
    if ( error instanceof Error && /eventKey|unique|duplicate/i.test( error.message ) ) return { created: false };
    throw error;
  }
}
