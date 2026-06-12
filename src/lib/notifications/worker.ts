import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { createEmailTransport } from "./email-transports";
import { renderNotificationEmail } from "./email-template";
import { getSmsConfig } from "./config";
import { createSmsTransport, type SmsTransport } from "./sms";
import { SqliteNotificationQueue, type NotificationQueue } from "./queue";
import type { EmailTransport, NotificationDeliveryRecord } from "./types";
import { zonedDateTimeToDate } from "./time";

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
  if ( template === "booking_reminder" ) {
    return `Goldridr reminder: booking ${ reference } is scheduled for ${ payload.date } at ${ payload.time }.`;
  }
  if ( template === "booking_created" ) {
    return `Goldridr: we received booking ${ reference } for ${ payload.date } at ${ payload.time }. We will notify you when it is confirmed.`;
  }
  if ( template === "booking_assignment" ) {
    const chauffeur = String( payload.chauffeurName || "" );
    return chauffeur
      ? `Goldridr update: ${ chauffeur } is assigned to booking ${ reference }.`
      : `Goldridr update: booking ${ reference } is awaiting a chauffeur assignment.`;
  }
  if ( template === "booking_deleted" ) {
    return `Goldridr update: booking ${ reference } was deleted. Contact us if this was unexpected.`;
  }
  return `Goldridr update: booking ${ reference } is now ${ payload.status || "updated" }.`;
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

function createAdminFailureAlert( delivery: NotificationDeliveryRecord, error: unknown ): void {
  const db = getDb();
  const notificationId = Number( db.prepare( `
    INSERT INTO notifications (eventKey, type, category, title, body, metadata)
    VALUES (?, 'delivery.failed', 'system', 'Notification delivery failed', ?, ?)
  ` ).run(
    `delivery:${ delivery.id }:dead:${ randomUUID() }`,
    `Delivery ${ delivery.id } to ${ delivery.recipient } exhausted retries: ${ error instanceof Error ? error.message : "Unknown error" }`,
    JSON.stringify( { deliveryId: delivery.id } )
  ).lastInsertRowid );
  db.prepare( "INSERT INTO notification_recipients (notificationId, userId) VALUES (?, 'admin')" ).run( notificationId );
}

export class NotificationWorker {
  private emailTransport: EmailTransport | null = null;
  private smsTransport: SmsTransport | null = null;

  constructor( private readonly queue: NotificationQueue = new SqliteNotificationQueue() ) {}

  async verify(): Promise<void> {
    this.emailTransport = createEmailTransport();
    await this.emailTransport.verify();
    this.smsTransport = createSmsTransport();
    await this.smsTransport.verify();
  }

  async runOnce( limit = 20 ): Promise<{ claimed: number; delivered: number; failed: number }> {
    if ( !this.emailTransport ) await this.verify();
    const deliveries = await this.queue.claim( limit );
    let delivered = 0;
    let failed = 0;
    for ( const delivery of deliveries ) {
      try {
        await this.deliver( delivery );
        delivered++;
      } catch ( error ) {
        this.fail( delivery, error );
        failed++;
      }
    }
    return { claimed: deliveries.length, delivered, failed };
  }

  private async deliver( delivery: NotificationDeliveryRecord ): Promise<void> {
    const db = getDb();
    const notification = db.prepare(
      "SELECT * FROM notifications WHERE id = ?"
    ).get( delivery.notificationId ) as { id: number; bookingReference: string | null; category: string } | undefined;
    if ( !notification ) throw new Error( "Notification no longer exists" );

    if ( notification.category === "reminders" && notification.bookingReference ) {
      const booking = db.prepare( "SELECT status, date, time FROM bookings WHERE reference = ?" ).get( notification.bookingReference ) as { status: string; date: string; time: string } | undefined;
      if ( !booking || [ "cancelled", "rejected" ].includes( booking.status ) || zonedDateTimeToDate( booking.date, booking.time ).getTime() <= Date.now() ) {
        db.prepare( `
          UPDATE notification_deliveries
          SET status = 'cancelled', leaseToken = NULL, leaseExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        ` ).run( delivery.id );
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
      const message = await renderNotificationEmail(
        delivery.template || "default",
        delivery.recipient,
        payload,
        delivery.idempotencyKey
      );
      result = await this.emailTransport!.send( message );
    } else if ( delivery.channel === "sms" ) {
      if ( !this.smsTransport ) this.smsTransport = createSmsTransport();
      const smsConfig = getSmsConfig();
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

    db.prepare( `
      UPDATE notification_deliveries
      SET status = 'delivered', attempts = attempts + 1, provider = ?, providerMessageId = ?,
          accepted = ?, rejected = ?, response = ?, providerMetadata = ?, lastError = NULL,
          leaseToken = NULL, leaseExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    ` ).run(
      result.provider,
      result.messageId,
      JSON.stringify( result.accepted ),
      JSON.stringify( result.rejected ),
      result.response || null,
      JSON.stringify( result.metadata || {} ),
      delivery.id
    );
  }

  private fail( delivery: NotificationDeliveryRecord, error: unknown ): void {
    const db = getDb();
    const attempts = delivery.attempts + 1;
    const retry = isTransient( error ) && attempts <= RETRY_DELAYS_MS.length;
    if ( retry ) {
      db.prepare( `
        UPDATE notification_deliveries
        SET status = 'pending', attempts = ?, nextAttemptAt = ?, lastError = ?,
            leaseToken = NULL, leaseExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      ` ).run( attempts, nextAttempt( attempts - 1, error ).toISOString(), error instanceof Error ? error.message : String( error ), delivery.id );
      return;
    }
    const status = attempts > RETRY_DELAYS_MS.length ? "dead_letter" : "failed";
    db.prepare( `
      UPDATE notification_deliveries
      SET status = ?, attempts = ?, lastError = ?, leaseToken = NULL, leaseExpiresAt = NULL,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    ` ).run( status, attempts, error instanceof Error ? error.message : String( error ), delivery.id );
    if ( status === "dead_letter" ) createAdminFailureAlert( delivery, error );
  }

  async close(): Promise<void> {
    await this.emailTransport?.close();
    await this.smsTransport?.close();
  }
}
