import Database from "better-sqlite3";
import path from "path";
import { hashPassword } from "@/lib/password";
import { assertFutureBookingTime } from "@/lib/booking-time";
import { getNotificationTimeZone } from "@/lib/admin-settings";
import { zonedDateTimeToDate } from "@/lib/notifications/time";
import {
  enqueueBookingAssignmentChanged,
  enqueueBookingConflict,
  enqueueBookingCreated,
  enqueueBookingDeleted,
  enqueueBookingRescheduled,
  enqueueBookingStatusChanged,
} from "@/lib/notifications/store";

const DB_PATH = path.join( process.cwd(), "bookings.db" );

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if ( !dbInstance ) {
    dbInstance = new Database( DB_PATH );
    
    // Create bookings, blocked slots, and chauffeurs tables
    dbInstance.exec( `
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        tripType TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        tripDetails TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS blocked_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        recurring TEXT DEFAULT 'none',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chauffeurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'active',
        passwordHash TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventKey TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        bookingReference TEXT,
        actorUserId TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notification_recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notificationId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        readAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notificationId, userId),
        FOREIGN KEY(notificationId) REFERENCES notifications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notificationId INTEGER NOT NULL,
        channel TEXT NOT NULL,
        recipient TEXT NOT NULL,
        template TEXT,
        payload TEXT NOT NULL DEFAULT '{}',
        idempotencyKey TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduledAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        nextAttemptAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        attempts INTEGER NOT NULL DEFAULT 0,
        leaseToken TEXT,
        leaseExpiresAt DATETIME,
        provider TEXT,
        providerMessageId TEXT,
        accepted TEXT,
        rejected TEXT,
        response TEXT,
        providerMetadata TEXT,
        lastError TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(notificationId) REFERENCES notifications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        userId TEXT NOT NULL,
        category TEXT NOT NULL,
        inApp INTEGER NOT NULL DEFAULT 1,
        email INTEGER NOT NULL DEFAULT 1,
        sms INTEGER NOT NULL DEFAULT 0,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(userId, category)
      );

      CREATE TABLE IF NOT EXISTS sms_consents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerEmail TEXT NOT NULL,
        phone TEXT NOT NULL,
        consentVersion TEXT NOT NULL,
        consentedAt DATETIME NOT NULL,
        revokedAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notification_provider_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        providerEventId TEXT NOT NULL,
        providerMessageId TEXT,
        eventType TEXT NOT NULL,
        payload TEXT NOT NULL,
        receivedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, providerEventId)
      );

      CREATE TABLE IF NOT EXISTS mock_sms_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sid TEXT UNIQUE NOT NULL,
        accountSid TEXT,
        fromNumber TEXT NOT NULL,
        toNumber TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        errorMessage TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS discount_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        kind TEXT NOT NULL,
        value INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        maxRedemptions INTEGER,
        redemptions INTEGER NOT NULL DEFAULT 0,
        expiresAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookingReference TEXT NOT NULL,
        amountCents INTEGER NOT NULL CHECK(amountCents >= 0),
        currency TEXT NOT NULL DEFAULT 'USD',
        method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        transactionReference TEXT,
        notes TEXT,
        paidAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bookingReference) REFERENCES bookings(reference) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_notification_recipients_user
        ON notification_recipients(userId, id);
      CREATE INDEX IF NOT EXISTS idx_notification_deliveries_claim
        ON notification_deliveries(status, nextAttemptAt, leaseExpiresAt);
      CREATE INDEX IF NOT EXISTS idx_notification_deliveries_provider
        ON notification_deliveries(provider, providerMessageId);
      CREATE INDEX IF NOT EXISTS idx_mock_sms_messages_created
        ON mock_sms_messages(createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_booking
        ON payments(bookingReference, createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_status
        ON payments(status, createdAt DESC);
    ` );

    // Alter table migrations to add columns safely if they do not exist
    try {
      dbInstance.exec( "ALTER TABLE blocked_slots ADD COLUMN endDate TEXT;" );
    } catch {}
    try {
      dbInstance.exec( "ALTER TABLE blocked_slots ADD COLUMN isFullDay INTEGER DEFAULT 0;" );
    } catch {}
    try {
      dbInstance.exec( "ALTER TABLE bookings ADD COLUMN chauffeurId INTEGER;" );
    } catch {}
    try {
      dbInstance.exec( "ALTER TABLE blocked_slots ADD COLUMN chauffeurId INTEGER;" );
    } catch {}
    try {
      dbInstance.exec( "ALTER TABLE chauffeurs ADD COLUMN passwordHash TEXT;" );
    } catch {}
    try {
      dbInstance.exec( "ALTER TABLE bookings ADD COLUMN smsConsentVersion TEXT;" );
    } catch {}
    try {
      dbInstance.exec( "ALTER TABLE bookings ADD COLUMN smsConsentedAt DATETIME;" );
    } catch {}

    dbInstance.pragma( "journal_mode = WAL" );
    dbInstance.pragma( "foreign_keys = ON" );

    // Auto-seed chauffeurs if empty
    try {
      const rowCount = dbInstance.prepare( "SELECT COUNT(*) as count FROM chauffeurs" ).get() as { count: number };
      if ( rowCount.count === 0 ) {
        const defaultPassword = process.env.CHAUFFEUR_DEFAULT_PASSWORD;
        if ( !defaultPassword ) throw new Error( "CHAUFFEUR_DEFAULT_PASSWORD is not configured" );
        const defaultPasswordHash = hashPassword(
          defaultPassword
        );
        const insertChauffeur = dbInstance.prepare(
          "INSERT INTO chauffeurs (name, email, phone, passwordHash) VALUES (?, ?, ?, ?)"
        );
        insertChauffeur.run( "James Mercer", "james@goldridr.com", "+1 (713) 555-0199", defaultPasswordHash );
        insertChauffeur.run( "Sarah Connor", "sarah@goldridr.com", "+1 (713) 555-0211", defaultPasswordHash );
        insertChauffeur.run( "Michael Vance", "michael@goldridr.com", "+1 (713) 555-0288", defaultPasswordHash );
      }

      const missingPasswords = dbInstance.prepare(
        "SELECT id FROM chauffeurs WHERE passwordHash IS NULL OR passwordHash = ''"
      ).all() as { id: number }[];
      const setPassword = dbInstance.prepare( "UPDATE chauffeurs SET passwordHash = ? WHERE id = ?" );
      for ( const chauffeur of missingPasswords ) {
        const defaultPassword = process.env.CHAUFFEUR_DEFAULT_PASSWORD;
        if ( !defaultPassword ) throw new Error( "CHAUFFEUR_DEFAULT_PASSWORD is not configured" );
        setPassword.run(
          hashPassword( defaultPassword ),
          chauffeur.id
        );
      }
    } catch ( e ) {
      console.error( "Failed to seed chauffeurs:", e );
    }
  }
  return dbInstance;
}

export interface ChauffeurRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  passwordHash?: string;
}

export interface BookingRecord {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  duration: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: string;
  tripDetails: string; // JSON string
  chauffeurId?: number | null;
  smsConsentVersion?: string | null;
  smsConsentedAt?: string | null;
  createdAt: string;
}

export interface MockSmsMessageRecord {
  id: number;
  sid: string;
  accountSid: string | null;
  fromNumber: string;
  toNumber: string;
  body: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: number;
  bookingReference: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  transactionReference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerEmail?: string;
  tripType?: string;
  tripDate?: string;
  tripTime?: string;
  bookingStatus?: string;
  tripDetails?: string;
}

export interface DiscountCodeRecord {
  id: number;
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  active: number;
  maxRedemptions: number | null;
  redemptions: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountUsageRecord {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  tripType: string;
  tripDate: string;
  tripTime: string;
  bookingStatus: string;
  originalAmountCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
  createdAt: string;
}

export interface DiscountCodeWithUsage extends DiscountCodeRecord {
  usages: DiscountUsageRecord[];
  trackedRedemptions: number;
  totalDiscountCents: number;
  totalRevenueCents: number;
}

export class DiscountCodeError extends Error {
  constructor( message: string ) {
    super( message );
    this.name = "DiscountCodeError";
  }
}

export function normalizeDiscountCode( code: string ): string {
  return code.trim().toUpperCase().replace( /\s+/g, "" );
}

function parseBookingTripDetails( tripDetails: string ): Record<string, unknown> {
  try {
    const parsed = JSON.parse( tripDetails || "{}" );
    return parsed && typeof parsed === "object" && !Array.isArray( parsed ) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function serializeBookingTripDetails( tripDetails: Record<string, unknown> ): string {
  return JSON.stringify( tripDetails );
}

function calculateDiscountAmountCents( baseAmountCents: number, discount: DiscountCodeRecord ): number {
  if ( discount.kind === "percent" ) {
    return Math.min( baseAmountCents, Math.round( baseAmountCents * discount.value / 100 ) );
  }
  return Math.min( baseAmountCents, Math.max( 0, discount.value ) );
}

function claimDiscountCode(
  db: Database.Database,
  code: string
): DiscountCodeRecord {
  const normalizedCode = normalizeDiscountCode( code );
  const discount = db.prepare( "SELECT * FROM discount_codes WHERE code = ?" )
    .get( normalizedCode ) as DiscountCodeRecord | undefined;

  if ( !discount || !discount.active ) {
    throw new DiscountCodeError( "Invalid discount code" );
  }

  if ( discount.expiresAt && new Date( discount.expiresAt ).getTime() <= Date.now() ) {
    throw new DiscountCodeError( "Discount code has expired" );
  }

  if ( discount.maxRedemptions !== null && discount.redemptions >= discount.maxRedemptions ) {
    throw new DiscountCodeError( "Discount code has reached its redemption limit" );
  }

  db.prepare( "UPDATE discount_codes SET redemptions = redemptions + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?" )
    .run( discount.id );
  return { ...discount, redemptions: discount.redemptions + 1 };
}

export function getAllChauffeurs(): ChauffeurRecord[] {
  const db = getDb();
  return db.prepare(
    "SELECT id, name, email, phone, status FROM chauffeurs WHERE status = 'active' ORDER BY name ASC"
  ).all() as ChauffeurRecord[];
}

export function createChauffeur(
  chauffeur: Pick<ChauffeurRecord, "name" | "email" | "phone"> & { password: string }
): ChauffeurRecord {
  const db = getDb();
  const existing = db.prepare(
    "SELECT id FROM chauffeurs WHERE LOWER(email) = LOWER(?) AND status = 'active'"
  ).get( chauffeur.email ) as { id: number } | undefined;

  if ( existing ) {
    throw new Error( "A chauffeur with this email already exists" );
  }

  const result = db.prepare(
    "INSERT INTO chauffeurs (name, email, phone, status, passwordHash) VALUES (?, ?, ?, 'active', ?)"
  ).run( chauffeur.name, chauffeur.email, chauffeur.phone || null, hashPassword( chauffeur.password ) );

  return db.prepare(
    "SELECT id, name, email, phone, status FROM chauffeurs WHERE id = ?"
  ).get( result.lastInsertRowid ) as ChauffeurRecord;
}

export function getChauffeurByEmail( email: string ): ChauffeurRecord | undefined {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM chauffeurs WHERE LOWER(email) = LOWER(?) AND status = 'active'"
  ).get( email ) as ChauffeurRecord | undefined;
}

export function getChauffeurById( id: number ): ChauffeurRecord | undefined {
  const db = getDb();
  return db.prepare(
    "SELECT id, name, email, phone, status FROM chauffeurs WHERE id = ? AND status = 'active'"
  ).get( id ) as ChauffeurRecord | undefined;
}

export function getBookingsForChauffeur( chauffeurId: number ): BookingRecord[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM bookings WHERE chauffeurId = ? ORDER BY createdAt DESC"
  ).all( chauffeurId ) as BookingRecord[];
}

export function deleteChauffeur( id: number ): boolean {
  const db = getDb();
  const remove = db.transaction( () => {
    const assignedBookings = db.prepare(
      "SELECT * FROM bookings WHERE chauffeurId = ?"
    ).all( id ) as BookingRecord[];
    const result = db.prepare(
      "UPDATE chauffeurs SET status = 'inactive' WHERE id = ? AND status = 'active'"
    ).run( id );

    if ( result.changes === 0 ) return false;

    db.prepare( "UPDATE bookings SET chauffeurId = NULL WHERE chauffeurId = ?" ).run( id );
    for ( const booking of assignedBookings ) {
      enqueueBookingAssignmentChanged( db, { ...booking, chauffeurId: null }, id );
    }
    db.prepare( "DELETE FROM blocked_slots WHERE chauffeurId = ?" ).run( id );
    return true;
  } );

  return remove();
}

export function saveBooking(
  booking: Omit<BookingRecord, "id" | "createdAt"> & { discountCode?: string | null }
): BookingRecord {
  const db = getDb();
  assertFutureBookingTime( booking.date, booking.time, new Date(), getNotificationTimeZone() );
  const stmt = db.prepare( `
    INSERT INTO bookings (
      reference, tripType, date, time, duration, name, email, phone, notes, status, tripDetails, chauffeurId,
      smsConsentVersion, smsConsentedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  ` );

  const insert = db.transaction( () => {
    const tripDetails = parseBookingTripDetails( booking.tripDetails );
    if ( booking.discountCode?.trim() ) {
      const baseAmountCents = Math.round(
        Number( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice ?? 0 ) * 100
      );
      if ( !Number.isFinite( baseAmountCents ) || baseAmountCents <= 0 ) {
        throw new DiscountCodeError( "Discount codes require a quoted booking total" );
      }
      const discount = claimDiscountCode( db, booking.discountCode );
      const discountAmountCents = calculateDiscountAmountCents( baseAmountCents, discount );
      const finalAmountCents = Math.max( 0, baseAmountCents - discountAmountCents );
      tripDetails.discountCode = discount.code;
      tripDetails.discountLabel = discount.label;
      tripDetails.discountKind = discount.kind;
      tripDetails.discountValue = discount.value;
      tripDetails.discountAmountCents = discountAmountCents;
      tripDetails.originalEstimatedTotal = baseAmountCents / 100;
      tripDetails.estimatedTotal = finalAmountCents / 100;
      if ( tripDetails.estimatedPrice !== undefined ) {
        tripDetails.originalEstimatedPrice = Number( tripDetails.estimatedPrice );
        tripDetails.estimatedPrice = finalAmountCents / 100;
      }
    }

    stmt.run(
      booking.reference,
      booking.tripType,
      booking.date,
      booking.time,
      booking.duration,
      booking.name,
      booking.email,
      booking.phone,
      booking.notes,
      booking.status,
      serializeBookingTripDetails( tripDetails ),
      booking.chauffeurId || null,
      booking.smsConsentVersion || null,
      booking.smsConsentedAt || null
    );

    const row = db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( booking.reference ) as BookingRecord;
    enqueueBookingCreated( db, row );
    return row;
  } );

  return insert();
}

export function getAllBookings(): BookingRecord[] {
  const db = getDb();
  return db.prepare( "SELECT * FROM bookings ORDER BY createdAt DESC" ).all() as BookingRecord[];
}

export function getBookingByReference( reference: string ): BookingRecord | undefined {
  const db = getDb();
  return db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
}

export function getAllPayments(): PaymentRecord[] {
  return getDb().prepare( `
    SELECT
      p.*,
      b.name AS customerName,
      b.email AS customerEmail,
      b.tripType,
      b.date AS tripDate,
      b.time AS tripTime,
      b.status AS bookingStatus,
      b.tripDetails
    FROM payments p
    INNER JOIN bookings b ON b.reference = p.bookingReference
    ORDER BY p.createdAt DESC, p.id DESC
  ` ).all() as PaymentRecord[];
}

function assertBookingCanReceivePayment( booking: Pick<BookingRecord, "status"> ) {
  if ( booking.status === "cancelled" ) {
    throw new Error( "Cannot record a payment for a cancelled booking" );
  }
}

export function confirmBookingForPaidPayment(
  db: Database.Database,
  bookingReference: string
): boolean {
  const booking = db.prepare(
    "SELECT * FROM bookings WHERE reference = ?"
  ).get( bookingReference ) as BookingRecord | undefined;

  if ( !booking ) throw new Error( "Booking not found" );
  assertBookingCanReceivePayment( booking );
  if ( [ "confirmed", "accepted" ].includes( booking.status ) ) return false;

  db.prepare(
    "UPDATE bookings SET status = 'confirmed' WHERE reference = ?"
  ).run( bookingReference );
  enqueueBookingStatusChanged( db, { ...booking, status: "confirmed" }, booking.status );
  return true;
}

export function createPayment( payment: {
  bookingReference: string;
  amountCents: number;
  currency?: string;
  method: string;
  status: string;
  transactionReference?: string | null;
  notes?: string | null;
} ): PaymentRecord {
  const db = getDb();
  const insert = db.transaction( () => {
    const booking = db.prepare(
      "SELECT reference, status FROM bookings WHERE reference = ?"
    ).get( payment.bookingReference ) as Pick<BookingRecord, "reference" | "status"> | undefined;
    if ( !booking ) throw new Error( "Booking not found" );
    assertBookingCanReceivePayment( booking );

    const paidAt = payment.status === "paid" ? new Date().toISOString() : null;
    const result = db.prepare( `
      INSERT INTO payments (
        bookingReference, amountCents, currency, method, status,
        transactionReference, notes, paidAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ` ).run(
      payment.bookingReference,
      payment.amountCents,
      payment.currency || "USD",
      payment.method,
      payment.status,
      payment.transactionReference || null,
      payment.notes || null,
      paidAt
    );

    if ( payment.status === "paid" ) {
      confirmBookingForPaidPayment( db, payment.bookingReference );
    }

    return db.prepare( "SELECT * FROM payments WHERE id = ?" )
      .get( result.lastInsertRowid ) as PaymentRecord;
  } );

  return insert();
}

export function updatePayment( id: number, updates: {
  amountCents?: number;
  method?: string;
  status?: string;
  transactionReference?: string | null;
  notes?: string | null;
} ): boolean {
  const db = getDb();
  const update = db.transaction( () => {
    const existing = db.prepare( "SELECT * FROM payments WHERE id = ?" ).get( id ) as PaymentRecord | undefined;
    if ( !existing ) return false;

    const nextStatus = updates.status ?? existing.status;
    const paidAt = nextStatus === "paid"
      ? existing.paidAt || new Date().toISOString()
      : null;

    const result = db.prepare( `
      UPDATE payments
      SET amountCents = ?,
          method = ?,
          status = ?,
          transactionReference = ?,
          notes = ?,
          paidAt = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    ` ).run(
      updates.amountCents ?? existing.amountCents,
      updates.method ?? existing.method,
      nextStatus,
      updates.transactionReference === undefined ? existing.transactionReference : updates.transactionReference,
      updates.notes === undefined ? existing.notes : updates.notes,
      paidAt,
      id
    );

    if ( nextStatus === "paid" ) {
      confirmBookingForPaidPayment( db, existing.bookingReference );
    }

    return result.changes > 0;
  } );

  return update();
}

export function deletePayment( id: number ): boolean {
  return getDb().prepare( "DELETE FROM payments WHERE id = ?" ).run( id ).changes > 0;
}

function generateMockSmsSid(): string {
  return `SM${ Math.random().toString( 36 ).slice( 2, 18 ).toUpperCase().padEnd( 32, "0" ).slice( 0, 32 ) }`;
}

export function insertMockSmsMessage( input: {
  sid?: string;
  accountSid?: string | null;
  fromNumber: string;
  toNumber: string;
  body: string;
  status?: string;
  errorMessage?: string | null;
} ): MockSmsMessageRecord {
  const db = getDb();
  const sid = input.sid || generateMockSmsSid();
  db.prepare( `
    INSERT INTO mock_sms_messages (sid, accountSid, fromNumber, toNumber, body, status, errorMessage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ` ).run(
    sid,
    input.accountSid || null,
    input.fromNumber,
    input.toNumber,
    input.body,
    input.status || "queued",
    input.errorMessage || null
  );
  return db.prepare( "SELECT * FROM mock_sms_messages WHERE sid = ?" ).get( sid ) as MockSmsMessageRecord;
}

export function updateMockSmsMessageStatus( sid: string, status: string, errorMessage?: string | null ): boolean {
  const db = getDb();
  const result = db.prepare( `
    UPDATE mock_sms_messages
    SET status = ?, errorMessage = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE sid = ?
  ` ).run( status, errorMessage || null, sid );
  return result.changes > 0;
}

export function listMockSmsMessages( limit = 50 ): MockSmsMessageRecord[] {
  const db = getDb();
  return db.prepare( `
    SELECT * FROM mock_sms_messages
    ORDER BY id DESC
    LIMIT ?
  ` ).all( limit ) as MockSmsMessageRecord[];
}

export function clearMockSmsMessages(): number {
  const db = getDb();
  return db.prepare( "DELETE FROM mock_sms_messages" ).run().changes;
}

export function updateBookingStatus( reference: string, status: string ): boolean {
  const db = getDb();
  return db.transaction( () => {
    const booking = db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking || booking.status === status ) return false;
    const result = db.prepare( "UPDATE bookings SET status = ? WHERE reference = ?" ).run( status, reference );
    enqueueBookingStatusChanged( db, { ...booking, status }, booking.status );
    return result.changes > 0;
  } )();
}

export function updateBookingChauffeur( reference: string, chauffeurId: number | null ): boolean {
  const db = getDb();
  return db.transaction( () => {
    const booking = db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking || booking.chauffeurId === chauffeurId ) return false;
    const result = db.prepare( "UPDATE bookings SET chauffeurId = ? WHERE reference = ?" ).run( chauffeurId, reference );
    const updatedBooking = { ...booking, chauffeurId };
    enqueueBookingAssignmentChanged( db, updatedBooking, booking.chauffeurId ?? null );
    if ( chauffeurId ) {
      const conflict = findBookingConflict( db, updatedBooking );
      if ( conflict ) enqueueBookingConflict( db, updatedBooking, conflict.reference );
    }
    return result.changes > 0;
  } )();
}

export function updateBookingSchedule(
  reference: string,
  schedule: { date: string; time: string; duration?: number }
): boolean {
  const db = getDb();
  assertFutureBookingTime( schedule.date, schedule.time, new Date(), getNotificationTimeZone() );
  return db.transaction( () => {
    const booking = db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking ) return false;
    const duration = schedule.duration ?? booking.duration;
    if ( booking.date === schedule.date && booking.time === schedule.time && booking.duration === duration ) return false;
    db.prepare( "UPDATE bookings SET date = ?, time = ?, duration = ? WHERE reference = ?" )
      .run( schedule.date, schedule.time, duration, reference );
    const updatedBooking = { ...booking, date: schedule.date, time: schedule.time, duration };
    enqueueBookingRescheduled( db, updatedBooking, { date: booking.date, time: booking.time, duration: booking.duration } );
    const conflict = findBookingConflict( db, updatedBooking );
    if ( conflict ) enqueueBookingConflict( db, updatedBooking, conflict.reference );
    return true;
  } )();
}

function findBookingConflict( db: Database.Database, booking: BookingRecord ): BookingRecord | undefined {
  if ( !booking.chauffeurId || [ "cancelled", "rejected" ].includes( booking.status ) ) return undefined;
  const timeZone = getNotificationTimeZone();
  const candidates = db.prepare( `
    SELECT * FROM bookings
    WHERE reference <> ? AND date = ? AND chauffeurId = ?
      AND status NOT IN ('cancelled', 'rejected')
  ` ).all( booking.reference, booking.date, booking.chauffeurId ) as BookingRecord[];
  const start = zonedDateTimeToDate( booking.date, booking.time, timeZone ).getTime();
  const end = start + booking.duration * 60_000;
  return candidates.find( candidate => {
    const candidateStart = zonedDateTimeToDate( candidate.date, candidate.time, timeZone ).getTime();
    const candidateEnd = candidateStart + candidate.duration * 60_000;
    return start < candidateEnd && end > candidateStart;
  } );
}

export function deleteBooking( reference: string ): boolean {
  const db = getDb();
  const remove = db.transaction( () => {
    const booking = db.prepare(
      "SELECT * FROM bookings WHERE reference = ?"
    ).get( reference ) as BookingRecord | undefined;
    if ( !booking ) return false;

    enqueueBookingDeleted( db, booking );
    return db.prepare( "DELETE FROM bookings WHERE reference = ?" )
      .run( reference ).changes > 0;
  } );
  return remove();
}

// ── App settings (key/value) ──────────────────────────────────────────────────
export function getAppSetting( key: string ): string | null {
  const row = getDb().prepare( "SELECT value FROM app_settings WHERE key = ?" ).get( key ) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setAppSetting( key: string, value: string ): void {
  getDb().prepare( `
    INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
  ` ).run( key, value );
}

export function getAllDiscountCodes(): DiscountCodeRecord[] {
  return getDb().prepare( "SELECT * FROM discount_codes ORDER BY createdAt DESC, id DESC" ).all() as DiscountCodeRecord[];
}

export function getDiscountCodesWithUsage(): DiscountCodeWithUsage[] {
  const discountCodes = getAllDiscountCodes();
  const usageByCode = new Map<string, DiscountUsageRecord[]>();
  const bookings = getDb().prepare( `
    SELECT reference, name, email, tripType, date, time, status, tripDetails, createdAt
    FROM bookings
    ORDER BY createdAt DESC, id DESC
  ` ).all() as Array<Pick<
    BookingRecord,
    "reference" | "name" | "email" | "tripType" | "date" | "time" | "status" | "tripDetails" | "createdAt"
  >>;

  for ( const booking of bookings ) {
    const tripDetails = parseBookingTripDetails( booking.tripDetails );
    const code = typeof tripDetails.discountCode === "string"
      ? normalizeDiscountCode( tripDetails.discountCode )
      : "";
    if ( !code ) continue;

    const discountAmountCents = Number( tripDetails.discountAmountCents );
    const originalAmount = Number(
      tripDetails.originalEstimatedTotal
      ?? tripDetails.originalEstimatedPrice
      ?? tripDetails.estimatedTotal
      ?? tripDetails.estimatedPrice
      ?? 0
    );
    const finalAmount = Number( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice ?? 0 );
    const usage: DiscountUsageRecord = {
      bookingReference: booking.reference,
      customerName: booking.name,
      customerEmail: booking.email,
      tripType: booking.tripType,
      tripDate: booking.date,
      tripTime: booking.time,
      bookingStatus: booking.status,
      originalAmountCents: Number.isFinite( originalAmount ) ? Math.round( originalAmount * 100 ) : 0,
      discountAmountCents: Number.isFinite( discountAmountCents ) ? Math.round( discountAmountCents ) : 0,
      finalAmountCents: Number.isFinite( finalAmount ) ? Math.round( finalAmount * 100 ) : 0,
      createdAt: booking.createdAt,
    };
    usageByCode.set( code, [ ...( usageByCode.get( code ) || [] ), usage ] );
  }

  return discountCodes.map( discount => {
    const usages = usageByCode.get( discount.code ) || [];
    return {
      ...discount,
      usages,
      trackedRedemptions: usages.length,
      totalDiscountCents: usages.reduce( ( total, usage ) => total + usage.discountAmountCents, 0 ),
      totalRevenueCents: usages.reduce( ( total, usage ) => total + usage.finalAmountCents, 0 ),
    };
  } );
}

export function getDiscountCodeByCode( code: string ): DiscountCodeRecord | undefined {
  const normalized = normalizeDiscountCode( code );
  return getDb().prepare( "SELECT * FROM discount_codes WHERE code = ?" ).get( normalized ) as DiscountCodeRecord | undefined;
}

export function createDiscountCode( input: {
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  active?: boolean;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
} ): DiscountCodeRecord {
  const db = getDb();
  const code = normalizeDiscountCode( input.code );
  const result = db.prepare( `
    INSERT INTO discount_codes (code, label, kind, value, active, maxRedemptions, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ` ).run(
    code,
    input.label.trim(),
    input.kind,
    input.value,
    input.active === false ? 0 : 1,
    input.maxRedemptions ?? null,
    input.expiresAt || null
  );
  return db.prepare( "SELECT * FROM discount_codes WHERE id = ?" ).get( result.lastInsertRowid ) as DiscountCodeRecord;
}

export function updateDiscountCode(
  id: number,
  updates: Partial<{
    code: string;
    label: string;
    kind: "percent" | "fixed";
    value: number;
    active: boolean;
    maxRedemptions: number | null;
    expiresAt: string | null;
  }>
): boolean {
  const db = getDb();
  const existing = db.prepare( "SELECT * FROM discount_codes WHERE id = ?" ).get( id ) as DiscountCodeRecord | undefined;
  if ( !existing ) return false;

  const nextCode = updates.code !== undefined ? normalizeDiscountCode( updates.code ) : existing.code;
  const nextLabel = updates.label !== undefined ? updates.label.trim() : existing.label;
  const nextKind = updates.kind ?? existing.kind;
  const nextValue = updates.value ?? existing.value;
  const nextActive = updates.active !== undefined ? ( updates.active ? 1 : 0 ) : existing.active;
  const nextMaxRedemptions = updates.maxRedemptions !== undefined ? updates.maxRedemptions : existing.maxRedemptions;
  const nextExpiresAt = updates.expiresAt !== undefined ? updates.expiresAt : existing.expiresAt;

  const result = db.prepare( `
    UPDATE discount_codes
    SET code = ?,
        label = ?,
        kind = ?,
        value = ?,
        active = ?,
        maxRedemptions = ?,
        expiresAt = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  ` ).run( nextCode, nextLabel, nextKind, nextValue, nextActive, nextMaxRedemptions, nextExpiresAt, id );

  return result.changes > 0;
}

export function deleteDiscountCode( id: number ): boolean {
  return getDb().prepare( "DELETE FROM discount_codes WHERE id = ?" ).run( id ).changes > 0;
}

export const DEFAULT_BOOKING_BUFFER_MINUTES = 30;

/** Minimum turnaround gap required between two rides for the same chauffeur. */
export function getBookingBufferMinutes(): number {
  const raw = getAppSetting( "bookingBufferMinutes" );
  const parsed = raw === null ? NaN : Number( raw );
  return Number.isFinite( parsed ) && parsed >= 0 ? parsed : DEFAULT_BOOKING_BUFFER_MINUTES;
}

export function checkBookingClash(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): { clash: boolean; conflictingBooking?: BookingRecord } {
  try {
    const db = getDb();
    const timeZone = getNotificationTimeZone();
    
    // Any booking that hasn't been explicitly killed holds its slot —
    // pending requests must block too, or the same hour can be sold twice
    // before an admin confirms.
    let bookingsOnDate: BookingRecord[];
    if ( chauffeurId !== undefined && chauffeurId !== null ) {
      bookingsOnDate = db.prepare(
        "SELECT * FROM bookings WHERE date = ? AND chauffeurId = ? AND status NOT IN ('cancelled', 'rejected')"
      ).all( date, chauffeurId ) as BookingRecord[];
    } else {
      bookingsOnDate = db.prepare(
        "SELECT * FROM bookings WHERE date = ? AND status NOT IN ('cancelled', 'rejected')"
      ).all( date ) as BookingRecord[];
    }

    const requestedStart = zonedDateTimeToDate( date, time, timeZone ).getTime();
    const requestedEnd = requestedStart + durationMinutes * 60 * 1000;
    // Rides need turnaround time between them, so each existing booking
    // occupies its slot plus the configured buffer on both sides.
    const bufferMs = getBookingBufferMinutes() * 60 * 1000;

    for ( const b of bookingsOnDate ) {
      try {
        const existingStart = zonedDateTimeToDate( b.date, b.time, timeZone ).getTime();
        const existingEnd = existingStart + b.duration * 60 * 1000;

        if ( requestedStart < existingEnd + bufferMs && requestedEnd + bufferMs > existingStart ) {
          return { clash: true, conflictingBooking: b };
        }
      } catch ( err ) {
        console.error( "Error parsing existing booking date for clash:", err );
      }
    }
  } catch ( err ) {
    console.error( "Database error in checkBookingClash:", err );
  }

  return { clash: false };
}

export interface BlockedSlotRecord {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  isFullDay: number;
  time: string;
  duration: number;
  recurring: string; // 'none', 'daily', 'weekly', 'weekends'
  chauffeurId?: number | null;
  createdAt: string;
}

export function saveBlockedSlot( block: Omit<BlockedSlotRecord, "id" | "createdAt"> ): BlockedSlotRecord {
  const db = getDb();
  const stmt = db.prepare( `
    INSERT INTO blocked_slots (
      title, date, endDate, isFullDay, time, duration, recurring, chauffeurId
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  ` );
  stmt.run( 
    block.title, 
    block.date, 
    block.endDate || null, 
    block.isFullDay ?? 0, 
    block.time, 
    block.duration, 
    block.recurring,
    block.chauffeurId || null
  );
  const row = db.prepare( "SELECT * FROM blocked_slots ORDER BY id DESC LIMIT 1" ).get() as BlockedSlotRecord;
  return row;
}

export function getAllBlockedSlots(): BlockedSlotRecord[] {
  const db = getDb();
  return db.prepare( "SELECT * FROM blocked_slots ORDER BY id DESC" ).all() as BlockedSlotRecord[];
}

export function getBlockedSlotsForChauffeur( chauffeurId: number ): BlockedSlotRecord[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM blocked_slots WHERE chauffeurId IS NULL OR chauffeurId = ? ORDER BY id DESC"
  ).all( chauffeurId ) as BlockedSlotRecord[];
}

export function deleteBlockedSlot( id: number ): boolean {
  const db = getDb();
  const stmt = db.prepare( "DELETE FROM blocked_slots WHERE id = ?" );
  const result = stmt.run( id );
  return result.changes > 0;
}

export function deleteChauffeurBlockedSlot( id: number, chauffeurId: number ): boolean {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM blocked_slots WHERE id = ? AND chauffeurId = ?"
  ).run( id, chauffeurId );
  return result.changes > 0;
}

export function checkBlockedClash(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): { clash: boolean; conflictingBlock?: BlockedSlotRecord } {
  try {
    const db = getDb();
    const timeZone = getNotificationTimeZone();
    let blocks: BlockedSlotRecord[];

    if ( chauffeurId !== undefined && chauffeurId !== null ) {
      blocks = db.prepare( "SELECT * FROM blocked_slots WHERE chauffeurId IS NULL OR chauffeurId = ?" ).all( chauffeurId ) as BlockedSlotRecord[];
    } else {
      blocks = db.prepare( "SELECT * FROM blocked_slots" ).all() as BlockedSlotRecord[];
    }

    const requestedStart = zonedDateTimeToDate( date, time, timeZone ).getTime();
    const requestedEnd = requestedStart + durationMinutes * 60 * 1000;

    for ( const b of blocks ) {
      try {
        let isDateOverlap = false;
        const requestedDOW = zonedDateTimeToDate( date, "00:00", timeZone ).getDay();

        if ( b.recurring === "none" ) {
          // Date range check if endDate exists, else exact match
          if ( b.endDate ) {
            isDateOverlap = date >= b.date && date <= b.endDate;
          } else {
            isDateOverlap = b.date === date;
          }
        } else if ( b.recurring === "daily" ) {
          // Daily blocks apply to any date
          isDateOverlap = true;
        } else if ( b.recurring === "weekly" ) {
          // Weekly matches if DOW is identical
          const blockDOW = zonedDateTimeToDate( b.date, "00:00", timeZone ).getDay();
          isDateOverlap = requestedDOW === blockDOW;
        } else if ( b.recurring === "weekends" ) {
          // Weekends matches Saturday (6) or Sunday (0)
          isDateOverlap = requestedDOW === 0 || requestedDOW === 6;
        }

        if ( isDateOverlap ) {
          // Full-Day block locks the ENTIRE day instantly
          if ( b.isFullDay === 1 ) {
            return { clash: true, conflictingBlock: b };
          }

          // Otherwise, compare normalized time spans
          const [ bHours, bMins ] = b.time.split( ":" );
          const blockStartOnReqDate = zonedDateTimeToDate(
            date,
            `${ bHours.padStart( 2, "0" ) }:${ bMins.padStart( 2, "0" ) }`,
            timeZone
          ).getTime();
          const blockEndOnReqDate = blockStartOnReqDate + b.duration * 60 * 1000;

          // Check overlap: requestedStart < blockEnd AND requestedEnd > blockStart
          if ( requestedStart < blockEndOnReqDate && requestedEnd > blockStartOnReqDate ) {
            return { clash: true, conflictingBlock: b };
          }
        }
      } catch ( err ) {
        console.error( "Error in block clash check:", err );
      }
    }
  } catch ( err ) {
    console.error( "Database error in checkBlockedClash:", err );
  }

  return { clash: false };
}

export function findAvailableChauffeur(
  date: string,
  time: string,
  durationMinutes: number
): ChauffeurRecord | null {
  const chauffeurs = getAllChauffeurs();
  for ( const c of chauffeurs ) {
    const bClash = checkBookingClash( date, time, durationMinutes, c.id );
    if ( bClash.clash ) continue;

    const blockClash = checkBlockedClash( date, time, durationMinutes, c.id );
    if ( blockClash.clash ) continue;

    // Chauffeur is completely available!
    return c;
  }
  return null;
}
