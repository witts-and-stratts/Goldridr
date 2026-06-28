import type { DatabaseLike } from "@/lib/db-client";
import { randomUUID } from "crypto";
import type { AuthSession } from "@/lib/auth";
import type { BookingRecord, ChauffeurRecord } from "@/lib/db";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryRecord,
  NotificationRecord,
} from "./types";
import { sendPushToUsers } from "./push";
import { zonedDateTimeToDate } from "./time";
import { getAppUrl } from "@/lib/admin-settings";

interface DeliveryInput {
  channel: Exclude<NotificationChannel, "in_app">;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  scheduledAt?: Date;
  preferenceUserId?: string;
}

interface NotificationInput {
  eventKey: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  bookingReference?: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
  inAppUserIds?: string[];
  deliveries?: DeliveryInput[];
}

async function getChauffeur( db: DatabaseLike, id?: number | null ): Promise<ChauffeurRecord | undefined> {
  if ( !id ) return undefined;
  return await db.prepare( "SELECT id, name, email, phone, status FROM chauffeurs WHERE id = ?" ).get( id ) as ChauffeurRecord | undefined;
}

async function insertNotification( db: DatabaseLike, input: NotificationInput ): Promise<number> {
  const existing = await db.prepare( "SELECT id FROM notifications WHERE eventKey = ?" ).get( input.eventKey ) as { id: number } | undefined;
  if ( existing ) return existing.id;

  const result = await db.prepare( `
    INSERT INTO notifications (eventKey, type, category, title, body, bookingReference, actorUserId, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ` ).run(
    input.eventKey,
    input.type,
    input.category,
    input.title,
    input.body,
    input.bookingReference || null,
    input.actorUserId || null,
    JSON.stringify( input.metadata || {} )
  );
  const notificationId = Number( result.lastInsertRowid );

  const addRecipient = await db.prepare( `
    INSERT OR IGNORE INTO notification_recipients (notificationId, userId) VALUES (?, ?)
  ` );
  const pushUserIds: string[] = [];
  for ( const userId of new Set( input.inAppUserIds || [] ) ) {
    if ( await channelEnabled( db, userId, input.category, "inApp" ) ) {
      await addRecipient.run( notificationId, userId );
      pushUserIds.push( userId );
    }
  }
  // Fire-and-forget: device push mirrors the in-app feed and must not block
  // or fail the booking write that triggered it.
  void sendPushToUsers( db, pushUserIds, {
    title: input.title,
    body: input.body,
    data: { url: input.bookingReference ? `/ride/${ input.bookingReference }` : "/notifications" },
  } ).catch( error => {
    if ( !process.env.NODE_TEST_CONTEXT ) console.error( "Push notification send failed", error );
  } );

  const addDelivery = await db.prepare( `
    INSERT OR IGNORE INTO notification_deliveries (
      notificationId, channel, recipient, template, payload, idempotencyKey, scheduledAt, nextAttemptAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ` );
  for ( const [ index, delivery ] of ( input.deliveries || [] ).entries() ) {
    if ( delivery.preferenceUserId && !await channelEnabled( db, delivery.preferenceUserId, input.category, delivery.channel ) ) continue;
    const scheduledAt = ( delivery.scheduledAt || new Date() ).toISOString();
    await addDelivery.run(
      notificationId,
      delivery.channel,
      delivery.recipient,
      delivery.template,
      JSON.stringify( delivery.payload ),
      `${ input.eventKey }:${ delivery.channel }:${ index }:${ delivery.recipient }`,
      scheduledAt,
      scheduledAt
    );
  }
  return notificationId;
}

async function channelEnabled(
  db: DatabaseLike,
  userId: string,
  category: NotificationCategory,
  channel: "inApp" | "email" | "sms"
): Promise<boolean> {
  const row = await db.prepare( `
    SELECT inApp, email, sms FROM notification_preferences WHERE userId = ? AND category = ?
  ` ).get( userId, category ) as { inApp: number; email: number; sms: number } | undefined;
  if ( row ) return Boolean( row[ channel ] );
  return channel !== "sms";
}

async function bookingPayload( booking: BookingRecord ): Promise<Record<string, unknown>> {
  let tripDetails: Record<string, unknown> = {};
  try {
    tripDetails = JSON.parse( booking.tripDetails || "{}" ) as Record<string, unknown>;
  } catch {
    tripDetails = {};
  }

  return {
    bookingReference: booking.reference,
    passengerName: booking.name,
    passengerEmail: booking.email,
    passengerPhone: booking.phone,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    tripType: booking.tripType,
    notes: booking.notes,
    tripDetails,
    pin: booking.pin ?? null,
    appUrl: await getAppUrl(),
  };
}

function pickupDate( booking: BookingRecord ): Date {
  return zonedDateTimeToDate( booking.date, booking.time );
}

async function reminderDeliveries( booking: BookingRecord, chauffeur?: ChauffeurRecord ): Promise<DeliveryInput[]> {
  const deliveries: DeliveryInput[] = [];
  for ( const hours of [ 24, 2 ] ) {
    const scheduledAt = new Date( pickupDate( booking ).getTime() - hours * 60 * 60 * 1000 );
    if ( scheduledAt.getTime() <= Date.now() ) continue;
    const payload = { ...await bookingPayload( booking ), reminderHours: hours };
    deliveries.push( { channel: "email", recipient: booking.email, template: "booking_reminder", payload, scheduledAt } );
    if ( booking.phone && booking.smsConsentedAt ) {
      deliveries.push( { channel: "sms", recipient: booking.phone, template: "booking_reminder", payload, scheduledAt } );
    }
    if ( chauffeur?.email ) {
      deliveries.push( {
        channel: "email",
        recipient: chauffeur.email,
        template: "chauffeur_reminder",
        payload: { ...payload, chauffeurName: chauffeur.name },
        scheduledAt,
        preferenceUserId: `chauffeur:${ chauffeur.id }`,
      } );
    }
  }
  return deliveries;
}

export async function enqueueBookingCreated( db: DatabaseLike, booking: BookingRecord ): Promise<void> {
  const chauffeur = await getChauffeur( db, booking.chauffeurId );
  const payload = await bookingPayload( booking );
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:created`,
    type: "booking.created",
    category: "bookings",
    title: `New booking ${ booking.reference }`,
    body: `${ booking.name } requested a ${ booking.tripType } ride for ${ booking.date } at ${ booking.time }.`,
    bookingReference: booking.reference,
    metadata: payload,
    inAppUserIds: [ "admin", ...( chauffeur ? [ `chauffeur:${ chauffeur.id }` ] : [] ) ],
    deliveries: [
      { channel: "email", recipient: booking.email, template: "booking_created", payload },
      ...( booking.phone && booking.smsConsentedAt
        ? [ {
            channel: "sms" as const,
            recipient: booking.phone,
            template: "booking_created",
            payload,
          } ]
        : [] ),
      ...( chauffeur?.email
        ? [ { channel: "email" as const, recipient: chauffeur.email, template: "chauffeur_assignment", payload: { ...payload, chauffeurName: chauffeur.name }, preferenceUserId: `chauffeur:${ chauffeur.id }` } ]
        : [] ),
    ],
  } );
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:reminders`,
    type: "booking.reminders_scheduled",
    category: "reminders",
    title: `Reminders scheduled for ${ booking.reference }`,
    body: "Customer and chauffeur reminders are scheduled before pickup.",
    bookingReference: booking.reference,
    metadata: payload,
    deliveries: await reminderDeliveries( booking, chauffeur ),
  } );

  if ( booking.phone && booking.smsConsentVersion && booking.smsConsentedAt ) {
    await db.prepare( `
      INSERT INTO sms_consents (customerEmail, phone, consentVersion, consentedAt)
      VALUES (?, ?, ?, ?)
    ` ).run( booking.email, booking.phone, booking.smsConsentVersion, booking.smsConsentedAt );
  }
}

export async function enqueueBookingStatusChanged(
  db: DatabaseLike,
  booking: BookingRecord,
  previousStatus: string
): Promise<void> {
  const chauffeur = await getChauffeur( db, booking.chauffeurId );
  const restored = [ "cancelled", "rejected" ].includes( previousStatus ) && [ "confirmed", "accepted" ].includes( booking.status );
  const type = restored ? "booking.restored" : `booking.${ booking.status }`;
  const payload = { ...await bookingPayload( booking ), status: booking.status, previousStatus };
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:status:${ previousStatus }:${ booking.status }:${ Date.now() }`,
    type,
    category: "bookings",
    title: `Booking ${ booking.reference } ${ restored ? "restored" : booking.status }`,
    body: `${ booking.name }'s booking changed from ${ previousStatus } to ${ booking.status }.`,
    bookingReference: booking.reference,
    metadata: payload,
    inAppUserIds: [ "admin", ...( chauffeur ? [ `chauffeur:${ chauffeur.id }` ] : [] ) ],
    deliveries: [
      { channel: "email", recipient: booking.email, template: "booking_status", payload },
      ...( booking.phone && booking.smsConsentedAt
        ? [ { channel: "sms" as const, recipient: booking.phone, template: "booking_status", payload } ]
        : [] ),
    ],
  } );

  if ( [ "cancelled", "rejected" ].includes( booking.status ) ) {
    await db.prepare( `
      UPDATE notification_deliveries
      SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP
      WHERE status = 'pending'
        AND notificationId IN (
          SELECT id FROM notifications WHERE bookingReference = ? AND category = 'reminders'
        )
    ` ).run( booking.reference );
  } else if ( restored ) {
    await insertNotification( db, {
      eventKey: `booking:${ booking.reference }:reminders:restored:${ Date.now() }`,
      type: "booking.reminders_rescheduled",
      category: "reminders",
      title: `Reminders rescheduled for ${ booking.reference }`,
      body: "Pickup reminders were restored.",
      bookingReference: booking.reference,
      metadata: payload,
      deliveries: await reminderDeliveries( booking, chauffeur ),
    } );
  }
}

export async function enqueueBookingAssignmentChanged(
  db: DatabaseLike,
  booking: BookingRecord,
  previousChauffeurId: number | null
): Promise<void> {
  const previous = await getChauffeur( db, previousChauffeurId );
  const next = await getChauffeur( db, booking.chauffeurId );
  const action = previous && next ? "reassigned" : next ? "assigned" : "unassigned";
  const payload = {
    ...await bookingPayload( booking ),
    previousChauffeurName: previous?.name,
    chauffeurName: next?.name,
    action,
  };
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:assignment:${ previousChauffeurId || "none" }:${ booking.chauffeurId || "none" }:${ Date.now() }`,
    type: `booking.${ action }`,
    category: "bookings",
    title: `Booking ${ booking.reference } ${ action }`,
    body: next ? `${ next.name } is now assigned to this booking.` : "The chauffeur was unassigned.",
    bookingReference: booking.reference,
    metadata: payload,
    inAppUserIds: [
      "admin",
      ...( previous ? [ `chauffeur:${ previous.id }` ] : [] ),
      ...( next ? [ `chauffeur:${ next.id }` ] : [] ),
    ],
    deliveries: [
      {
        channel: "email",
        recipient: booking.email,
        template: "booking_assignment",
        payload,
      },
      ...( booking.phone && booking.smsConsentedAt
        ? [ {
            channel: "sms" as const,
            recipient: booking.phone,
            template: "booking_assignment",
            payload,
          } ]
        : [] ),
      ...( previous?.email ? [ { channel: "email" as const, recipient: previous.email, template: "chauffeur_unassigned", payload, preferenceUserId: `chauffeur:${ previous.id }` } ] : [] ),
      ...( next?.email ? [ { channel: "email" as const, recipient: next.email, template: "chauffeur_assignment", payload, preferenceUserId: `chauffeur:${ next.id }` } ] : [] ),
    ],
  } );
}

export async function enqueueBookingDeleted(
  db: DatabaseLike,
  booking: BookingRecord
): Promise<void> {
  const chauffeur = await getChauffeur( db, booking.chauffeurId );
  const payload = {
    ...await bookingPayload( booking ),
    status: "deleted",
    chauffeurName: chauffeur?.name,
  };

  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:deleted:${ Date.now() }`,
    type: "booking.deleted",
    category: "bookings",
    title: `Booking ${ booking.reference } deleted`,
    body: `${ booking.name }'s booking was deleted.`,
    bookingReference: booking.reference,
    metadata: payload,
    inAppUserIds: [ "admin", ...( chauffeur ? [ `chauffeur:${ chauffeur.id }` ] : [] ) ],
    deliveries: [
      {
        channel: "email",
        recipient: booking.email,
        template: "booking_deleted",
        payload,
      },
      ...( booking.phone && booking.smsConsentedAt
        ? [ {
            channel: "sms" as const,
            recipient: booking.phone,
            template: "booking_deleted",
            payload,
          } ]
        : [] ),
      ...( chauffeur?.email
        ? [ {
            channel: "email" as const,
            recipient: chauffeur.email,
            template: "chauffeur_unassigned",
            payload,
            preferenceUserId: `chauffeur:${ chauffeur.id }`,
          } ]
        : [] ),
    ],
  } );

  await db.prepare( `
    UPDATE notification_deliveries
    SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP
    WHERE status = 'pending'
      AND notificationId IN (
        SELECT id FROM notifications WHERE bookingReference = ? AND category = 'reminders'
      )
  ` ).run( booking.reference );
}

export async function enqueueBookingRescheduled(
  db: DatabaseLike,
  booking: BookingRecord,
  previous: { date: string; time: string; duration: number }
): Promise<void> {
  const chauffeur = await getChauffeur( db, booking.chauffeurId );
  const payload = { ...await bookingPayload( booking ), previous };
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:rescheduled:${ previous.date }:${ previous.time }:${ Date.now() }`,
    type: "booking.rescheduled",
    category: "bookings",
    title: `Booking ${ booking.reference } rescheduled`,
    body: `Pickup moved from ${ previous.date } at ${ previous.time } to ${ booking.date } at ${ booking.time }.`,
    bookingReference: booking.reference,
    metadata: payload,
    inAppUserIds: [ "admin", ...( chauffeur ? [ `chauffeur:${ chauffeur.id }` ] : [] ) ],
    deliveries: [
      { channel: "email", recipient: booking.email, template: "booking_status", payload: { ...payload, status: "rescheduled" } },
      ...( booking.phone && booking.smsConsentedAt
        ? [ { channel: "sms" as const, recipient: booking.phone, template: "booking_status", payload: { ...payload, status: "rescheduled" } } ]
        : [] ),
      ...( chauffeur?.email
        ? [ {
            channel: "email" as const,
            recipient: chauffeur.email,
            template: "chauffeur_assignment",
            payload: { ...payload, chauffeurName: chauffeur.name },
            preferenceUserId: `chauffeur:${ chauffeur.id }`,
          } ]
        : [] ),
    ],
  } );
  await db.prepare( `
    UPDATE notification_deliveries
    SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP
    WHERE status = 'pending'
      AND notificationId IN (
        SELECT id FROM notifications WHERE bookingReference = ? AND category = 'reminders'
      )
  ` ).run( booking.reference );
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:reminders:rescheduled:${ Date.now() }`,
    type: "booking.reminders_rescheduled",
    category: "reminders",
    title: `Reminders rescheduled for ${ booking.reference }`,
    body: "Pickup reminders were updated to the new time.",
    bookingReference: booking.reference,
    metadata: payload,
    deliveries: await reminderDeliveries( booking, chauffeur ),
  } );
}

export async function enqueueBookingConflict(
  db: DatabaseLike,
  booking: BookingRecord,
  conflictingReference: string
): Promise<void> {
  await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:conflict:${ conflictingReference }:${ Date.now() }`,
    type: "booking.conflict",
    category: "system",
    title: `Schedule conflict for ${ booking.reference }`,
    body: `This assignment overlaps booking ${ conflictingReference }.`,
    bookingReference: booking.reference,
    metadata: { ...await bookingPayload( booking ), conflictingReference },
    inAppUserIds: [ "admin" ],
  } );
}

export async function listNotifications(
  db: DatabaseLike,
  userId: string,
  options: { unreadOnly?: boolean; category?: string; limit?: number; afterId?: number } = {}
): Promise<Array<NotificationRecord & { recipientId: number; readAt: string | null }>> {
  const clauses = [ "r.userId = ?" ];
  const params: Array<string | number> = [ userId ];
  if ( options.unreadOnly ) clauses.push( "r.readAt IS NULL" );
  if ( options.category ) {
    clauses.push( "n.category = ?" );
    params.push( options.category );
  }
  if ( options.afterId ) {
    clauses.push( "r.id > ?" );
    params.push( options.afterId );
  }
  params.push( Math.min( options.limit || 50, 100 ) );
  return await db.prepare( `
    SELECT n.*, r.id AS recipientId, r.readAt
    FROM notification_recipients r
    JOIN notifications n ON n.id = r.notificationId
    WHERE ${ clauses.join( " AND " ) }
    ORDER BY r.id DESC
    LIMIT ?
  ` ).all( ...params ) as Array<NotificationRecord & { recipientId: number; readAt: string | null }>;
}

export async function markNotificationsRead( db: DatabaseLike, userId: string, recipientIds?: number[] ): Promise<number> {
  if ( recipientIds?.length ) {
    const placeholders = recipientIds.map( () => "?" ).join( "," );
    const result = await db.prepare( `
      UPDATE notification_recipients SET readAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND id IN (${ placeholders }) AND readAt IS NULL
    ` ).run( userId, ...recipientIds );
    return result.changes;
  }
  const result = await db.prepare(
    "UPDATE notification_recipients SET readAt = CURRENT_TIMESTAMP WHERE userId = ? AND readAt IS NULL"
  ).run( userId );
  return result.changes;
}

export async function markNotificationsUnread( db: DatabaseLike, userId: string, recipientIds?: number[] ): Promise<number> {
  if ( recipientIds?.length ) {
    const placeholders = recipientIds.map( () => "?" ).join( "," );
    const result = await db.prepare( `
      UPDATE notification_recipients SET readAt = NULL
      WHERE userId = ? AND id IN (${ placeholders }) AND readAt IS NOT NULL
    ` ).run( userId, ...recipientIds );
    return result.changes;
  }
  const result = await db.prepare(
    "UPDATE notification_recipients SET readAt = NULL WHERE userId = ? AND readAt IS NOT NULL"
  ).run( userId );
  return result.changes;
}

export async function getUnreadCount( db: DatabaseLike, userId: string ): Promise<number> {
  return ( await db.prepare(
    "SELECT COUNT(*) AS count FROM notification_recipients WHERE userId = ? AND readAt IS NULL"
  ).get( userId ) as { count: number } ).count;
}

export async function deleteNotifications( db: DatabaseLike, userId: string, recipientIds?: number[] ): Promise<number> {
  if ( recipientIds?.length ) {
    const placeholders = recipientIds.map( () => "?" ).join( "," );
    const result = await db.prepare(
      `DELETE FROM notification_recipients WHERE userId = ? AND id IN (${ placeholders })`
    ).run( userId, ...recipientIds );
    return result.changes;
  }
  const result = await db.prepare( "DELETE FROM notification_recipients WHERE userId = ?" ).run( userId );
  return result.changes;
}

export async function claimDeliveries(
  db: DatabaseLike,
  limit = 20,
  leaseMs = 60_000
): Promise<NotificationDeliveryRecord[]> {
  const token = randomUUID();
  const expiresAt = new Date( Date.now() + leaseMs ).toISOString();
  const claim = db.transaction( async () => {
    const ids = await db.prepare( `
      SELECT d.id
      FROM notification_deliveries d
      JOIN notifications n ON n.id = d.notificationId
      WHERE d.status IN ('pending', 'processing')
        AND datetime(d.nextAttemptAt) <= datetime('now')
        AND (d.leaseExpiresAt IS NULL OR datetime(d.leaseExpiresAt) <= datetime('now'))
        AND NOT (
          n.category = 'reminders'
          AND EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.reference = n.bookingReference
              AND b.status IN ('cancelled', 'rejected')
          )
        )
      ORDER BY d.nextAttemptAt ASC, d.id ASC
      LIMIT ?
    ` ).all( limit ) as { id: number }[];
    if ( ids.length === 0 ) return [];
    const placeholders = ids.map( () => "?" ).join( "," );
    await db.prepare( `
      UPDATE notification_deliveries
      SET status = 'processing', leaseToken = ?, leaseExpiresAt = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id IN (${ placeholders })
    ` ).run( token, expiresAt, ...ids.map( row => row.id ) );
    return await db.prepare( `
      SELECT * FROM notification_deliveries WHERE leaseToken = ? ORDER BY id
    ` ).all( token ) as NotificationDeliveryRecord[];
  } );
  return await claim() as NotificationDeliveryRecord[];
}

export async function createManualMessage(
  db: DatabaseLike,
  session: AuthSession,
  booking: BookingRecord,
  subject: string,
  message: string,
  channels: Array<"email" | "sms">
): Promise<number> {
  const deliveries: DeliveryInput[] = [];
  for ( const channel of channels ) {
    if ( channel === "email" ) {
      deliveries.push( { channel, recipient: booking.email, template: "manual_message", payload: { subject, message, ...await bookingPayload( booking ) } } );
    } else if ( booking.phone && booking.smsConsentedAt ) {
      deliveries.push( { channel, recipient: booking.phone, template: "manual_message", payload: { subject, message, ...await bookingPayload( booking ) } } );
    }
  }
  return await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:manual:${ randomUUID() }`,
    type: "message.manual",
    category: "messages",
    title: subject,
    body: message,
    bookingReference: booking.reference,
    actorUserId: session.userId,
    metadata: await bookingPayload( booking ),
    inAppUserIds: [ "admin" ],
    deliveries,
  } );
}

export async function createBroadcast(
  db: DatabaseLike,
  session: AuthSession,
  chauffeurIds: number[],
  subject: string,
  message: string,
  channels: Array<"in_app" | "email" | "sms">
): Promise<number> {
  const chauffeurs = ( chauffeurIds.length
    ? await db.prepare( `SELECT * FROM chauffeurs WHERE status = 'active' AND id IN (${ chauffeurIds.map( () => "?" ).join( "," ) })` ).all( ...chauffeurIds )
    : await db.prepare( "SELECT * FROM chauffeurs WHERE status = 'active'" ).all()
  ) as ChauffeurRecord[];
  const deliveries: DeliveryInput[] = [];
  for ( const chauffeur of chauffeurs ) {
    for ( const channel of channels ) {
      if ( channel === "email" && chauffeur.email ) {
        deliveries.push( { channel, recipient: chauffeur.email, template: "broadcast", payload: { subject, message, chauffeurName: chauffeur.name }, preferenceUserId: `chauffeur:${ chauffeur.id }` } );
      } else if ( channel === "sms" && chauffeur.phone ) {
        deliveries.push( { channel, recipient: chauffeur.phone, template: "broadcast", payload: { subject, message, chauffeurName: chauffeur.name }, preferenceUserId: `chauffeur:${ chauffeur.id }` } );
      }
    }
  }
  return await insertNotification( db, {
    eventKey: `broadcast:${ randomUUID() }`,
    type: "message.broadcast",
    category: "messages",
    title: subject,
    body: message,
    actorUserId: session.userId,
    metadata: { chauffeurIds: chauffeurs.map( chauffeur => chauffeur.id ) },
    inAppUserIds: channels.includes( "in_app" ) ? chauffeurs.map( chauffeur => `chauffeur:${ chauffeur.id }` ) : [],
    deliveries,
  } );
}

export async function createManualReminder(
  db: DatabaseLike,
  session: AuthSession,
  booking: BookingRecord,
  channels: Array<"email" | "sms">
): Promise<number> {
  const chauffeur = await getChauffeur( db, booking.chauffeurId );
  const payload = { ...await bookingPayload( booking ), reminderHours: "Manual" };
  const deliveries: DeliveryInput[] = [];
  if ( channels.includes( "email" ) ) {
    deliveries.push( { channel: "email", recipient: booking.email, template: "booking_reminder", payload } );
    if ( chauffeur?.email ) {
      deliveries.push( {
        channel: "email",
        recipient: chauffeur.email,
        template: "chauffeur_reminder",
        payload: { ...payload, chauffeurName: chauffeur.name },
        preferenceUserId: `chauffeur:${ chauffeur.id }`,
      } );
    }
  }
  if ( channels.includes( "sms" ) && booking.phone && booking.smsConsentedAt ) {
    deliveries.push( { channel: "sms", recipient: booking.phone, template: "booking_reminder", payload } );
  }
  return await insertNotification( db, {
    eventKey: `booking:${ booking.reference }:reminder:manual:${ randomUUID() }`,
    type: "booking.reminder_manual",
    category: "reminders",
    title: `Reminder sent for ${ booking.reference }`,
    body: `A pickup reminder was queued for ${ booking.name }.`,
    bookingReference: booking.reference,
    actorUserId: session.userId,
    metadata: payload,
    inAppUserIds: [ "admin" ],
    deliveries,
  } );
}

export async function listReminderDeliveries(
  db: DatabaseLike,
  session: AuthSession
): Promise<Array<NotificationDeliveryRecord & {
  title: string;
  bookingReference: string | null;
  passengerName: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  lastError: string | null;
  providerMessageId: string | null;
  updatedAt: string;
}>> {
  const roleClause = session.role === "chauffeur" ? "AND b.chauffeurId = ?" : "";
  const params = session.role === "chauffeur" ? [ session.chauffeurId! ] : [];
  return await db.prepare( `
    SELECT d.*, n.title, n.bookingReference, b.name AS passengerName,
      b.date AS pickupDate, b.time AS pickupTime
    FROM notification_deliveries d
    JOIN notifications n ON n.id = d.notificationId
    LEFT JOIN bookings b ON b.reference = n.bookingReference
    WHERE n.category = 'reminders'
      ${ roleClause }
    ORDER BY d.updatedAt DESC, d.id DESC
    LIMIT 250
  ` ).all( ...params ) as Array<NotificationDeliveryRecord & {
    title: string;
    bookingReference: string | null;
    passengerName: string | null;
    pickupDate: string | null;
    pickupTime: string | null;
    lastError: string | null;
    providerMessageId: string | null;
    updatedAt: string;
  }>;
}

export async function getPreferences(
  db: DatabaseLike,
  userId: string
): Promise<Array<{ category: NotificationCategory; inApp: number; email: number; sms: number }>> {
  return await db.prepare( `
    SELECT category, inApp, email, sms
    FROM notification_preferences
    WHERE userId = ?
    ORDER BY category
  ` ).all( userId ) as Array<{ category: NotificationCategory; inApp: number; email: number; sms: number }>;
}

export async function setPreference(
  db: DatabaseLike,
  userId: string,
  category: NotificationCategory,
  preference: { inApp: boolean; email: boolean; sms: boolean }
): Promise<void> {
  await db.prepare( `
    INSERT INTO notification_preferences (userId, category, inApp, email, sms, updatedAt)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(userId, category) DO UPDATE SET
      inApp = excluded.inApp,
      email = excluded.email,
      sms = excluded.sms,
      updatedAt = CURRENT_TIMESTAMP
  ` ).run( userId, category, Number( preference.inApp ), Number( preference.email ), Number( preference.sms ) );
}

export async function listFailedDeliveries(
  db: DatabaseLike
): Promise<Array<NotificationDeliveryRecord & { title: string; bookingReference: string | null; lastError: string | null }>> {
  return await db.prepare( `
    SELECT d.*, n.title, n.bookingReference
    FROM notification_deliveries d
    JOIN notifications n ON n.id = d.notificationId
    WHERE d.status IN ('failed', 'dead_letter')
    ORDER BY d.updatedAt DESC
    LIMIT 100
  ` ).all() as Array<NotificationDeliveryRecord & { title: string; bookingReference: string | null; lastError: string | null }>;
}

export async function retryDelivery( db: DatabaseLike, deliveryId: number ): Promise<boolean> {
  const result = await db.prepare( `
    UPDATE notification_deliveries
    SET status = 'pending', attempts = 0, nextAttemptAt = CURRENT_TIMESTAMP,
        leaseToken = NULL, leaseExpiresAt = NULL, lastError = NULL, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN ('failed', 'dead_letter')
  ` ).run( deliveryId );
  return result.changes > 0;
}

export async function recordProviderEvent(
  db: DatabaseLike,
  provider: string,
  providerEventId: string,
  providerMessageId: string | undefined,
  eventType: string,
  payload: unknown
): Promise<void> {
  await db.transaction( async () => {
    const result = await db.prepare( `
      INSERT OR IGNORE INTO notification_provider_events
        (provider, providerEventId, providerMessageId, eventType, payload)
      VALUES (?, ?, ?, ?, ?)
    ` ).run( provider, providerEventId, providerMessageId || null, eventType, JSON.stringify( payload ) );
    if ( result.changes === 0 || !providerMessageId ) return;

    const normalized = eventType.toLowerCase();
    const status = normalized.includes( "delivered" ) || normalized === "delivery"
      ? "delivered"
      : normalized.includes( "bounce" ) || normalized.includes( "complaint" )
        || normalized.includes( "failed" ) || normalized.includes( "suppressed" )
        ? "failed"
        : null;
    if ( status ) {
      await db.prepare( `
        UPDATE notification_deliveries
        SET status = ?, providerMetadata = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE provider = ? AND providerMessageId = ?
      ` ).run( status, JSON.stringify( payload ), provider, providerMessageId );
    }
  } )();
}
