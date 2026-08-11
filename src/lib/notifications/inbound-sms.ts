import type { AuthSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/notifications/sms-consent";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { first } from "@/lib/pocketbase/core";
import { createPocketBaseInboundSms } from "@/lib/pocketbase/notifications";
import { getAllBookings, getBookingByReference } from "@/lib/pocketbase/repository";

export interface InboundSmsInput {
  providerMessageId: string;
  from: string;
  to: string;
  body: string;
  params: Record<string, string>;
}

function mediaFromParams( params: Record<string, string> ): Array<{ url: string; contentType: string }> {
  const count = Math.max( 0, Number( params.NumMedia || 0 ) || 0 );
  return Array.from( { length: count }, ( _, index ) => ( {
    url: String( params[ `MediaUrl${ index }` ] || "" ),
    contentType: String( params[ `MediaContentType${ index }` ] || "" ),
  } ) ).filter( item => item.url );
}

export async function recordInboundSms( input: InboundSmsInput ): Promise<{ created: boolean; notificationId?: number }> {
  const eventKey = `message.inbound_sms:twilio:${ input.providerMessageId }`;
  const existing = await first( pocketBaseCollections.notifications, "eventKey = {:eventKey}", { eventKey } );
  if ( existing ) return { created: false, notificationId: Number( existing.legacyId ) };

  const sender = normalizePhone( input.from );
  const booking = ( await getAllBookings() ).find( item => normalizePhone( item.phone ) === sender );
  try {
    const notificationId = await createPocketBaseInboundSms( {
      eventKey,
      providerMessageId: input.providerMessageId,
      sender: input.from,
      recipient: input.to,
      body: input.body,
      media: mediaFromParams( input.params ),
      booking,
    } );
    return { created: true, notificationId };
  } catch ( error ) {
    if ( error instanceof Error && /eventKey|unique|duplicate/i.test( error.message ) ) return { created: false };
    throw error;
  }
}

export async function linkInboundSmsToBooking( notificationId: number, bookingReference: string, session: AuthSession ): Promise<boolean> {
  const notification = await first(
    pocketBaseCollections.notifications,
    "legacyId = {:id} && type = 'message.inbound_sms'",
    { id: notificationId }
  );
  if ( !notification ) return false;
  const booking = await getBookingByReference( bookingReference );
  if ( !booking ) throw new Error( "Booking not found" );
  const metadata = notification.metadata && typeof notification.metadata === "object"
    ? notification.metadata as Record<string, unknown>
    : {};
  await getPocketBaseClient().collection( pocketBaseCollections.notifications ).update( notification.id, {
    bookingReference: booking.reference,
    title: `SMS from ${ booking.name }`,
    metadata: {
      ...metadata,
      passengerName: booking.name,
      passengerEmail: booking.email,
      passengerPhone: booking.phone,
      matched: true,
      linkedAt: new Date().toISOString(),
      linkedBy: session.userId,
    },
  } );
  return true;
}
