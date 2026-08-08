import { randomUUID } from "crypto";
import type { AuthSession } from "@/lib/auth";
import type { BookingRecord } from "./repository";
import { getAllChauffeurs } from "./repository";
import { getPocketBaseClient } from "./client";
import { pocketBaseCollections } from "./collections";
import { legacyId } from "./core";
import { sendPushToUsers } from "@/lib/notifications/push";

async function createNotification( input: { type: string; category: "messages" | "reminders" | "system"; title: string; body: string; eventKey?: string; bookingReference?: string; actorUserId?: string; metadata?: Record<string, unknown>; inAppUserIds?: string[]; deliveries?: Array<{ channel: "email" | "sms"; recipient: string; template: string; payload: Record<string, unknown> }> } ) {
  const pb = getPocketBaseClient();
  const notification = await pb.collection( pocketBaseCollections.notifications ).create( { legacyId: legacyId(), eventKey: input.eventKey || `${ input.type }:${ randomUUID() }`, type: input.type, category: input.category, title: input.title, body: input.body, bookingReference: input.bookingReference || "", actorUserId: input.actorUserId || "", metadata: input.metadata || {}, sourceCreatedAt: new Date().toISOString() } );
  await Promise.all( ( input.inAppUserIds || [] ).map( userId => pb.collection( pocketBaseCollections.recipients ).create( { legacyId: legacyId(), notification: notification.id, userId, sourceCreatedAt: new Date().toISOString() } ) ) );
  await Promise.all( ( input.deliveries || [] ).map( item => pb.collection( pocketBaseCollections.deliveries ).create( { legacyId: legacyId(), notification: notification.id, channel: item.channel, recipient: item.recipient, template: item.template, payload: item.payload, idempotencyKey: `${ notification.id }:${ item.channel }:${ item.recipient }`, status: "pending", scheduledAt: new Date().toISOString(), nextAttemptAt: new Date().toISOString(), attempts: 0 } ) ) );
  return Number( notification.legacyId );
}

function payload( booking: BookingRecord, subject: string, message: string ) { return { subject, message, bookingReference: booking.reference, passengerName: booking.name, passengerEmail: booking.email, passengerPhone: booking.phone, date: booking.date, time: booking.time, duration: booking.duration, tripType: booking.tripType, notes: booking.notes, tripDetails: JSON.parse( booking.tripDetails || "{}" ) }; }
type Delivery = { channel: "email" | "sms"; recipient: string; template: string; payload: Record<string, unknown> };
function bookingDeliveries( booking: BookingRecord, channels: Array<"email" | "sms">, template: string, value: Record<string, unknown> ): Delivery[] { const deliveries: Delivery[] = []; if ( channels.includes( "email" ) && typeof booking.email === "string" && booking.email.trim() ) deliveries.push( { channel: "email", recipient: booking.email.trim(), template, payload: value } ); if ( channels.includes( "sms" ) && booking.phone && booking.smsConsentedAt ) deliveries.push( { channel: "sms", recipient: booking.phone, template, payload: value } ); return deliveries; }

export async function createPocketBaseManualMessage( session: AuthSession, booking: BookingRecord, subject: string, message: string, channels: string[] ) { const data = payload( booking, subject, message ); const deliveryChannels = channels.filter( ( channel ): channel is "email" | "sms" => channel === "email" || channel === "sms" ); return createNotification( { type: "message.manual", category: "messages", title: subject, body: message, bookingReference: booking.reference, actorUserId: session.userId, metadata: { ...data, channels }, inAppUserIds: [ "admin" ], deliveries: bookingDeliveries( booking, deliveryChannels, "manual_message", data ) } ); }
export async function createPocketBaseInboundEmail( input: { eventKey: string; provider: string; providerMessageId: string; sender: string; recipient: string; subject: string; body: string; receivedAt?: string; messageId?: string; inReplyTo?: string; booking?: BookingRecord } ) {
  const booking = input.booking;
  return createNotification( {
    type: "message.inbound_email",
    category: "messages",
    title: input.subject || "Email reply",
    body: input.body,
    bookingReference: booking?.reference,
    metadata: {
      direction: "inbound",
      channel: "email",
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      sender: input.sender,
      recipient: input.recipient,
      messageId: input.messageId || "",
      inReplyTo: input.inReplyTo || "",
      receivedAt: input.receivedAt || new Date().toISOString(),
      passengerName: booking?.name || input.sender,
      passengerEmail: booking?.email || input.sender,
      passengerPhone: booking?.phone || "",
    },
    inAppUserIds: [ "admin" ],
  } );
}
export async function createPocketBaseBookingCreated( booking: BookingRecord ) { const data = { ...payload( booking, "", "" ), status: booking.status, pin: booking.pin || "" }; return createNotification( { type: "booking.created", category: "system", title: `Booking ${ booking.reference } received`, body: `Booking request received from ${ booking.name }.`, bookingReference: booking.reference, metadata: data, inAppUserIds: [ "admin" ], deliveries: bookingDeliveries( booking, [ "email", "sms" ], "booking_created", data ) } ); }
export async function createPocketBaseBookingStatusUpdate( booking: BookingRecord ) { const data = { ...payload( booking, "", "" ), status: booking.status }; return createNotification( { type: "booking.status_updated", category: "system", title: `Booking ${ booking.reference } is ${ booking.status }`, body: `Booking status updated for ${ booking.name }.`, bookingReference: booking.reference, metadata: data, inAppUserIds: [ "admin" ], deliveries: bookingDeliveries( booking, [ "email", "sms" ], "booking_status", data ) } ); }
export async function createPocketBaseFlightAlert( input: { bookingReference: string; chauffeurUserId?: string | null; title: string; body: string; fingerprint: string; metadata: Record<string, unknown> } ) {
  const inAppUserIds = [ "admin", ...( input.chauffeurUserId ? [ input.chauffeurUserId ] : [] ) ];
  const notificationId = await createNotification( {
    type: "flight.status_changed",
    category: "system",
    title: input.title,
    body: input.body,
    eventKey: `flight.status_changed:${ input.bookingReference }:${ input.fingerprint }`,
    bookingReference: input.bookingReference,
    metadata: input.metadata,
    inAppUserIds,
  } );
  if ( input.chauffeurUserId ) {
    await sendPushToUsers( undefined, [ input.chauffeurUserId ], {
      title: input.title,
      body: input.body,
      data: { bookingReference: input.bookingReference, type: "flight.status_changed" },
    } );
  }
  return notificationId;
}
export async function createPocketBaseBroadcast( session: AuthSession, chauffeurIds: string[], subject: string, message: string, channels: Array<"in_app" | "email" | "sms"> ) { const chauffeurs = ( await getAllChauffeurs() ).filter( chauffeur => chauffeurIds.length === 0 || chauffeurIds.includes( chauffeur.id ) ); return createNotification( { type: "message.broadcast", category: "messages", title: subject, body: message, actorUserId: session.userId, metadata: { chauffeurIds: chauffeurs.map( item => item.id ), channels }, inAppUserIds: channels.includes( "in_app" ) ? chauffeurs.map( item => `chauffeur:${ item.id }` ) : [], deliveries: chauffeurs.flatMap( chauffeur => [ ...( channels.includes( "email" ) && chauffeur.email ? [ { channel: "email" as const, recipient: chauffeur.email, template: "broadcast", payload: { subject, message, chauffeurName: chauffeur.name } } ] : [] ), ...( channels.includes( "sms" ) && chauffeur.phone ? [ { channel: "sms" as const, recipient: chauffeur.phone, template: "broadcast", payload: { subject, message, chauffeurName: chauffeur.name } } ] : [] ) ] ) } ); }
export async function createPocketBaseManualReminder( session: AuthSession, booking: BookingRecord, channels: Array<"email" | "sms"> ) { const data = payload( booking, `Reminder for ${ booking.reference }`, "" ); return createNotification( { type: "booking.reminder_manual", category: "reminders", title: `Reminder sent for ${ booking.reference }`, body: `A pickup reminder was queued for ${ booking.name }.`, bookingReference: booking.reference, actorUserId: session.userId, metadata: data, inAppUserIds: [ "admin" ], deliveries: bookingDeliveries( booking, channels, "booking_reminder", data ) } ); }
export async function listPocketBaseReminderDeliveries() { const pb = getPocketBaseClient(); return ( await pb.collection( pocketBaseCollections.deliveries ).getFullList( { filter: "notification.category = 'reminders'", sort: "-updated", expand: "notification" } ) ).map( record => ( { id: Number( record.legacyId ), notificationId: Number( ( record.expand?.notification as { legacyId?: number } | undefined )?.legacyId || 0 ), channel: record.channel, recipient: String( record.recipient ), template: record.template ? String( record.template ) : null, payload: JSON.stringify( record.payload || {} ), idempotencyKey: String( record.idempotencyKey ), status: record.status, scheduledAt: String( record.scheduledAt ), nextAttemptAt: String( record.nextAttemptAt ), attempts: Number( record.attempts || 0 ), leaseToken: record.leaseToken ? String( record.leaseToken ) : null, leaseExpiresAt: record.leaseExpiresAt ? String( record.leaseExpiresAt ) : null, title: String( ( record.expand?.notification as { title?: string } | undefined )?.title || "" ), bookingReference: ( record.expand?.notification as { bookingReference?: string } | undefined )?.bookingReference || null, updatedAt: String( record.updated ) } ) ); }
export async function recordPocketBaseProviderEvent( provider: string, providerEventId: string, providerMessageId: string | undefined, eventType: string, payload: unknown ) { const pb = getPocketBaseClient(); const filter = pb.filter( "provider = {:provider} && providerEventId = {:eventId}", { provider, eventId: providerEventId } ); try { await pb.collection( pocketBaseCollections.providerEvents ).getFirstListItem( filter ); return; } catch ( error ) { if ( !( typeof error === "object" && error && "status" in error && error.status === 404 ) ) throw error; } await pb.collection( pocketBaseCollections.providerEvents ).create( { legacyId: legacyId(), provider, providerEventId, providerMessageId: providerMessageId || "", eventType, payload, sourceReceivedAt: new Date().toISOString() } ); if ( !providerMessageId ) return; const status = /delivered|delivery/i.test( eventType ) ? "delivered" : /bounce|complaint|failed|suppressed/i.test( eventType ) ? "failed" : null; if ( !status ) return; const deliveries = await pb.collection( pocketBaseCollections.deliveries ).getFullList( { filter: pb.filter( "provider = {:provider} && providerMessageId = {:messageId}", { provider, messageId: providerMessageId } ), fields: "id" } ); await Promise.all( deliveries.map( item => pb.collection( pocketBaseCollections.deliveries ).update( item.id, { status, providerMetadata: payload } ) ) ); }
export async function listPocketBaseFailedDeliveries() { const pb = getPocketBaseClient(); return ( await pb.collection( pocketBaseCollections.deliveries ).getFullList( { filter: "status = 'failed' || status = 'dead_letter'", sort: "-updated", expand: "notification" } ) ).map( record => ( { id: Number( record.legacyId ), notificationId: Number( ( record.expand?.notification as { legacyId?: number } | undefined )?.legacyId || 0 ), channel: record.channel, recipient: String( record.recipient ), template: record.template ? String( record.template ) : null, payload: JSON.stringify( record.payload || {} ), idempotencyKey: String( record.idempotencyKey ), status: record.status, scheduledAt: String( record.scheduledAt ), nextAttemptAt: String( record.nextAttemptAt ), attempts: Number( record.attempts || 0 ), leaseToken: record.leaseToken ? String( record.leaseToken ) : null, leaseExpiresAt: record.leaseExpiresAt ? String( record.leaseExpiresAt ) : null, title: String( ( record.expand?.notification as { title?: string } | undefined )?.title || "" ), bookingReference: ( record.expand?.notification as { bookingReference?: string } | undefined )?.bookingReference || null, lastError: record.lastError ? String( record.lastError ) : null } ) ); }
export async function retryPocketBaseDelivery( id: number ) { const row = await getPocketBaseClient().collection( pocketBaseCollections.deliveries ).getFirstListItem( getPocketBaseClient().filter( "legacyId = {:id} && (status = 'failed' || status = 'dead_letter')", { id } ) ).catch( () => null ); if ( !row ) return false; await getPocketBaseClient().collection( pocketBaseCollections.deliveries ).update( row.id, { status: "pending", attempts: 0, nextAttemptAt: new Date().toISOString(), leaseToken: "", leaseExpiresAt: "", lastError: "" } ); return true; }
