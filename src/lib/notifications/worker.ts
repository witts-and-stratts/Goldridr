import { randomUUID } from "crypto";
import { createEmailTransport } from "./email-transports";
import { renderNotificationEmail } from "./email-template";
import { getSmsConfig } from "./config";
import { createSmsTransport, type SmsTransport } from "./sms";
import { processPushReceipts } from "./push";
import { createNotificationQueue, type NotificationQueue } from "./queue";
import type { EmailTransport, NotificationDeliveryRecord } from "./types";
import { zonedDateTimeToDate } from "./time";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first, legacyId } from "@/lib/pocketbase/core";

const RETRY_DELAYS_MS = [ 60_000, 300_000, 900_000, 3_600_000, 21_600_000 ];

function parsePayload( delivery: NotificationDeliveryRecord ): Record<string, unknown> {
  try {
    return JSON.parse( delivery.payload ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function smsBody( template: string | null, payload: Record<string, unknown> ): string {
  if ( template === "manual_message" || template === "broadcast" ) return String( payload.message || "" ).slice( 0, 1500 );
  const reference = String( payload.bookingReference || "" );
  const tripDetails = payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
  const terminal = typeof tripDetails.terminal === "string" && tripDetails.terminal.trim()
    ? ` Terminal: ${ tripDetails.terminal.trim() }.`
    : "";
  if ( template === "booking_reminder" ) {
    return `Goldridr reminder: booking ${ reference } is scheduled for ${ payload.date } at ${ payload.time }.${ terminal }`;
  }
  if ( template === "booking_created" ) {
    return `Goldridr: we received booking ${ reference } for ${ payload.date } at ${ payload.time }.${ terminal } We will notify you when it is confirmed.`;
  }
  if ( template === "booking_assignment" ) {
    const chauffeur = String( payload.chauffeurName || "" );
    return chauffeur
      ? `Goldridr update: ${ chauffeur } is assigned to booking ${ reference }.${ terminal }`
      : `Goldridr update: booking ${ reference } is awaiting a chauffeur assignment.${ terminal }`;
  }
  if ( template === "booking_deleted" ) {
    return `Goldridr update: booking ${ reference } was deleted.${ terminal } Contact us if this was unexpected.`;
  }
  return `Goldridr update: booking ${ reference } is now ${ payload.status || "updated" }.${ terminal }`;
}

function retryAfterMs( error: unknown ): number | undefined {
  if ( !( error instanceof Error ) ) return undefined;
  const value = ( error as Error & { retryAfter?: number; response?: { headers?: Record<string, string> } } ).retryAfter
    || Number( ( error as Error & { response?: { headers?: Record<string, string> } } ).response?.headers?.[ "retry-after" ] );
  return Number.isFinite( value ) && value > 0 ? value * 1000 : undefined;
}

function isTransient( error: unknown ): boolean {
  const candidate = error as Error & { code?: string; responseCode?: number; statusCode?: number; $metadata?: { httpStatusCode?: number } };
  const status = candidate.statusCode || candidate.$metadata?.httpStatusCode;
  if ( status === 429 || ( status && status >= 500 ) ) return true;
  if ( candidate.responseCode && candidate.responseCode >= 400 && candidate.responseCode < 500 ) return true;
  return [ "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "Throttling", "TooManyRequestsException" ].includes( candidate.code || "" );
}

function nextAttempt( attempts: number, error: unknown ): Date {
  const providerDelay = retryAfterMs( error );
  const base = providerDelay || RETRY_DELAYS_MS[ Math.min( attempts, RETRY_DELAYS_MS.length - 1 ) ];
  const jitter = Math.round( base * ( Math.random() * 0.2 - 0.1 ) );
  return new Date( Date.now() + base + jitter );
}

async function createAdminFailureAlert( delivery: NotificationDeliveryRecord, error: unknown ): Promise<void> {
  const pb = getPocketBaseClient();
  const notification = await pb.collection( pocketBaseCollections.notifications ).create( {
    legacyId: legacyId(), eventKey: `delivery:${ delivery.id }:dead:${ randomUUID() }`, type: "delivery.failed", category: "system",
    title: "Notification delivery failed", bookingReference: "", actorUserId: "", metadata: { deliveryId: delivery.id },
    body: `Delivery ${ delivery.id } to ${ delivery.recipient } exhausted retries: ${ error instanceof Error ? error.message : "Unknown error" }`,
    sourceCreatedAt: new Date().toISOString(),
  } );
  await pb.collection( pocketBaseCollections.recipients ).create( {
    legacyId: legacyId(), notification: notification.id, userId: "admin", sourceCreatedAt: new Date().toISOString(),
  } );
}

export class NotificationWorker {
  private emailTransport: EmailTransport | null = null;
  private smsTransport: SmsTransport | null = null;

  constructor( private readonly queue: NotificationQueue = createNotificationQueue() ) {}

  async verify(): Promise<void> {
    this.emailTransport = await createEmailTransport();
    await this.emailTransport.verify();
    this.smsTransport = await createSmsTransport();
    await this.smsTransport.verify();
  }

  async runOnce( limit = 20 ): Promise<{ claimed: number; delivered: number; failed: number }> {
    if ( !this.emailTransport ) await this.verify();
    await processPushReceipts( undefined );
    const deliveries = await this.queue.claim( limit );
    let delivered = 0;
    let failed = 0;
    for ( const delivery of deliveries ) {
      try {
        await this.deliver( delivery );
        delivered++;
      } catch ( error ) {
        await this.fail( delivery, error );
        failed++;
      }
    }
    return { claimed: deliveries.length, delivered, failed };
  }

  private async deliver( delivery: NotificationDeliveryRecord ): Promise<void> {
    const notification = await first( pocketBaseCollections.notifications, "legacyId = {:legacyId}", { legacyId: delivery.notificationId } );
    if ( !notification ) throw new Error( "Notification no longer exists" );

    if ( notification.category === "reminders" && notification.bookingReference ) {
      const booking = await first( pocketBaseCollections.bookings, "reference = {:reference}", { reference: String( notification.bookingReference ) } );
      if ( !booking || [ "cancelled", "rejected" ].includes( booking.status ) || zonedDateTimeToDate( String( booking.pickupDate ), String( booking.pickupTime ) ).getTime() <= Date.now() ) {
        await this.queue.update( delivery, { status: "cancelled", leaseToken: null, leaseExpiresAt: null } );
        return;
      }
    }

    const payload = { ...parsePayload( delivery ), notificationId: delivery.notificationId };
    let result: {
      provider: string;
      messageId: string;
      accepted: string[];
      rejected: string[];
      response?: string;
      metadata?: Record<string, unknown>;
    };
    if ( delivery.channel === "email" ) {
      if ( typeof delivery.recipient !== "string" || !delivery.recipient.trim() ) {
        throw new Error( "Email delivery has no recipient address" );
      }
      const message = await renderNotificationEmail(
        delivery.template || "default",
        delivery.recipient.trim(),
        payload,
        delivery.idempotencyKey
      );
      result = await this.emailTransport!.send( message );
    } else if ( delivery.channel === "sms" ) {
      if ( !this.smsTransport ) this.smsTransport = await createSmsTransport();
      const smsConfig = await getSmsConfig();
      const response = await this.smsTransport.send( {
        from: smsConfig.from,
        to: delivery.recipient,
        body: smsBody( delivery.template, payload ),
      } );
      result = {
        provider: response.provider,
        messageId: response.sid,
        accepted: [ delivery.recipient ],
        rejected: [],
        metadata: { status: response.status },
      };
    } else {
      throw new Error( `Unsupported delivery channel ${ delivery.channel }` );
    }

    await this.queue.update( delivery, {
      status: "delivered",
      attempts: delivery.attempts + 1,
      provider: result.provider,
      providerMessageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response || null,
      providerMetadata: result.metadata || {},
      lastError: null,
      leaseToken: null,
      leaseExpiresAt: null,
    } );
  }

  private async fail( delivery: NotificationDeliveryRecord, error: unknown ): Promise<void> {
    const attempts = delivery.attempts + 1;
    const retry = isTransient( error ) && attempts <= RETRY_DELAYS_MS.length;
    if ( retry ) {
      await this.queue.update( delivery, {
        status: "pending",
        attempts,
        nextAttemptAt: nextAttempt( attempts - 1, error ).toISOString(),
        lastError: error instanceof Error ? error.message : String( error ),
        leaseToken: null,
        leaseExpiresAt: null,
      } );
      return;
    }
    const status = attempts > RETRY_DELAYS_MS.length ? "dead_letter" : "failed";
    await this.queue.update( delivery, {
      status,
      attempts,
      lastError: error instanceof Error ? error.message : String( error ),
      leaseToken: null,
      leaseExpiresAt: null,
    } );
    if ( status === "dead_letter" ) await createAdminFailureAlert( delivery, error );
  }

  async close(): Promise<void> {
    await this.emailTransport?.close();
    await this.smsTransport?.close();
  }
}
