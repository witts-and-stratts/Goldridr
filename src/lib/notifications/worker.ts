import { randomUUID } from "crypto";
import { createEmailTransport } from "./email-transports";
import { renderNotificationEmail } from "./email-template";
import { createEmailOpenTrackingUrl } from "./email-open-tracking";
import { getSmsConfig } from "./config";
import { createSmsTransport, type SmsTransport } from "./sms";
import { processPushReceipts } from "./push";
import { createNotificationQueue, type NotificationQueue } from "./queue";
import type { EmailTransport, NotificationDeliveryRecord } from "./types";
import { zonedDateTimeToDate } from "./time";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first, legacyId } from "@/lib/pocketbase/core";
import { SMS_BODY_FULL_DISCLOSURE, SMS_BODY_OPT_OUT } from "@/lib/sms-consent-copy";

const RETRY_DELAYS_MS = [ 60_000, 300_000, 900_000, 3_600_000, 21_600_000 ];

export type NotificationWorkerEvent = {
  event: "notification.delivery.cancelled" | "notification.delivery.delivered" | "notification.delivery.failed" | "notification.delivery.retry_scheduled";
  deliveryId: number;
  notificationId: number;
  channel: NotificationDeliveryRecord[ "channel" ];
  template: string | null;
  attempts: number;
  provider?: string;
  status?: "dead_letter" | "failed";
  nextAttemptAt?: string;
  error?: { name: string; message: string; code?: string };
};

type NotificationWorkerEventHandler = ( event: NotificationWorkerEvent ) => void;

function errorDetails( error: unknown ): NonNullable<NotificationWorkerEvent[ "error" ]> {
  if ( error instanceof Error ) {
    const code = ( error as Error & { code?: unknown } ).code;
    return { name: error.name, message: error.message, ...( typeof code === "string" ? { code } : {} ) };
  }
  return { name: "Error", message: String( error ) };
}

function parsePayload( delivery: NotificationDeliveryRecord ): Record<string, unknown> {
  try {
    return JSON.parse( delivery.payload ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// A2P 10DLC requires every message to carry an opt-out instruction, and the first
// message of a conversation to also carry frequency and rate disclosure.
const SMS_OPT_OUT = SMS_BODY_OPT_OUT;
const SMS_FULL_DISCLOSURE = SMS_BODY_FULL_DISCLOSURE;

function withCompliance( body: string, disclosure: string ): string {
  const trimmed = body.trim();
  return trimmed.endsWith( disclosure ) ? trimmed : `${ trimmed } ${ disclosure }`;
}

function smsBody( template: string | null, payload: Record<string, unknown> ): string {
  if ( template === "manual_message" || template === "broadcast" ) {
    const message = String( payload.message || "" ).slice( 0, 1500 - SMS_OPT_OUT.length - 1 );
    return withCompliance( message, SMS_OPT_OUT );
  }
  const reference = String( payload.bookingReference || "" );
  const tripDetails = payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
  const terminal = typeof tripDetails.terminal === "string" && tripDetails.terminal.trim()
    ? ` Terminal: ${ tripDetails.terminal.trim() }.`
    : "";
  if ( template === "booking_reminder" ) {
    return withCompliance( `Goldridr reminder: booking ${ reference } is scheduled for ${ payload.date } at ${ payload.time }.${ terminal }`, SMS_OPT_OUT );
  }
  // booking_created is the first message a passenger receives after opting in, so it
  // doubles as the consent confirmation and carries the full disclosure.
  if ( template === "booking_created" ) {
    return withCompliance( `Goldridr: we received booking ${ reference } for ${ payload.date } at ${ payload.time }.${ terminal } We will notify you when it is confirmed.`, SMS_FULL_DISCLOSURE );
  }
  if ( template === "booking_assignment" ) {
    const chauffeur = String( payload.chauffeurName || "" );
    return withCompliance( chauffeur
      ? `Goldridr update: ${ chauffeur } is assigned to booking ${ reference }.${ terminal }`
      : `Goldridr update: booking ${ reference } is awaiting a chauffeur assignment.${ terminal }`, SMS_OPT_OUT );
  }
  if ( template === "booking_deleted" ) {
    return withCompliance( `Goldridr update: booking ${ reference } was deleted.${ terminal } Contact us if this was unexpected.`, SMS_OPT_OUT );
  }
  return withCompliance( `Goldridr update: booking ${ reference } is now ${ payload.status || "updated" }.${ terminal }`, SMS_OPT_OUT );
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

  constructor(
    private readonly queue: NotificationQueue = createNotificationQueue(),
    private readonly onEvent?: NotificationWorkerEventHandler
  ) {}

  private emit( event: NotificationWorkerEvent ): void {
    this.onEvent?.( event );
  }

  async verify(): Promise<void> {
    this.emailTransport = await createEmailTransport();
    await this.emailTransport.verify();
    this.smsTransport = await createSmsTransport();
    await this.smsTransport.verify();
  }

  async runOnce( limit = 20, concurrency = 5 ): Promise<{ claimed: number; delivered: number; failed: number }> {
    if ( !this.emailTransport ) await this.verify();
    await processPushReceipts( undefined );
    const deliveries = await this.queue.claim( limit );
    let delivered = 0;
    let failed = 0;
    const batchSize = Math.max( 1, Math.min( concurrency, deliveries.length ) );
    for ( let index = 0; index < deliveries.length; index += batchSize ) {
      const results = await Promise.all( deliveries.slice( index, index + batchSize ).map( async delivery => {
        try {
          await this.deliver( delivery );
          return true;
        } catch ( error ) {
          await this.fail( delivery, error );
          return false;
        }
      } ) );
      delivered += results.filter( Boolean ).length;
      failed += results.filter( result => !result ).length;
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
        this.emit( {
          event: "notification.delivery.cancelled", deliveryId: delivery.id, notificationId: delivery.notificationId,
          channel: delivery.channel, template: delivery.template, attempts: delivery.attempts,
        } );
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
        delivery.idempotencyKey,
        notification.type === "message.manual" ? await createEmailOpenTrackingUrl( delivery.id ) : undefined
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
    this.emit( {
      event: "notification.delivery.delivered", deliveryId: delivery.id, notificationId: delivery.notificationId,
      channel: delivery.channel, template: delivery.template, attempts: delivery.attempts + 1, provider: result.provider,
    } );
  }

  private async fail( delivery: NotificationDeliveryRecord, error: unknown ): Promise<void> {
    const attempts = delivery.attempts + 1;
    const retry = isTransient( error ) && attempts <= RETRY_DELAYS_MS.length;
    if ( retry ) {
      const nextAttemptAt = nextAttempt( attempts - 1, error ).toISOString();
      await this.queue.update( delivery, {
        status: "pending",
        attempts,
        nextAttemptAt,
        lastError: error instanceof Error ? error.message : String( error ),
        leaseToken: null,
        leaseExpiresAt: null,
      } );
      this.emit( {
        event: "notification.delivery.retry_scheduled", deliveryId: delivery.id, notificationId: delivery.notificationId,
        channel: delivery.channel, template: delivery.template, attempts, nextAttemptAt, error: errorDetails( error ),
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
    this.emit( {
      event: "notification.delivery.failed", deliveryId: delivery.id, notificationId: delivery.notificationId,
      channel: delivery.channel, template: delivery.template, attempts, status, error: errorDetails( error ),
    } );
    if ( status === "dead_letter" ) await createAdminFailureAlert( delivery, error );
  }

  async close(): Promise<void> {
    await this.emailTransport?.close();
    await this.smsTransport?.close();
  }
}
