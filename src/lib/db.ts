import { hashPassword } from "@/lib/password";
import { assertFutureBookingTime } from "@/lib/booking-time";
import { getNotificationTimeZone } from "@/lib/admin-settings";
import { zonedDateTimeToDate } from "@/lib/notifications/time";
import { getDatabase, type DatabaseLike } from "@/lib/db-client";
import {
  enqueueBookingAssignmentChanged,
  enqueueBookingConflict,
  enqueueBookingCreated,
  enqueueBookingDeleted,
  enqueueBookingRescheduled,
  enqueueBookingStatusChanged,
} from "@/lib/notifications/store";

const SCHEMA_SQL = `
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

      CREATE TABLE IF NOT EXISTS push_tokens (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        platform TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_push_tokens_user
        ON push_tokens(userId);

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

      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        colour TEXT,
        plate TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    `;

const ADDITIVE_MIGRATIONS = [
  "ALTER TABLE blocked_slots ADD COLUMN endDate TEXT",
  "ALTER TABLE blocked_slots ADD COLUMN isFullDay INTEGER DEFAULT 0",
  "ALTER TABLE bookings ADD COLUMN chauffeurId INTEGER",
  "ALTER TABLE blocked_slots ADD COLUMN chauffeurId INTEGER",
  "ALTER TABLE chauffeurs ADD COLUMN passwordHash TEXT",
  "ALTER TABLE bookings ADD COLUMN smsConsentVersion TEXT",
  "ALTER TABLE bookings ADD COLUMN smsConsentedAt DATETIME",
  "ALTER TABLE chauffeurs ADD COLUMN vehicleId INTEGER REFERENCES vehicles(id)",
  "ALTER TABLE bookings ADD COLUMN pin TEXT",
  "ALTER TABLE bookings ADD COLUMN pinConfirmedAt DATETIME",
];

let initialized = false;
let initializing: Promise<void> | null = null;

export async function getDb(): Promise<DatabaseLike> {
  const db = await getDatabase();
  if ( !initialized ) {
    initializing ??= initializeDb( db );
    await initializing;
  }
  return db;
}

export async function initializeDb( db?: DatabaseLike ): Promise<void> {
  db ??= await getDatabase();
  if ( initialized ) return;
  await db.exec( SCHEMA_SQL );
  for ( const sql of ADDITIVE_MIGRATIONS ) {
    try {
      await db.exec( sql );
    } catch {}
  }
  try {
    const rowCount = await db.prepare( "SELECT COUNT(*) as count FROM chauffeurs" ).get() as { count: number } | undefined;
    const defaultPassword = process.env.CHAUFFEUR_DEFAULT_PASSWORD;
    if ( rowCount?.count === 0 ) {
      if ( !defaultPassword ) throw new Error( "CHAUFFEUR_DEFAULT_PASSWORD is not configured" );
      const defaultPasswordHash = hashPassword( defaultPassword );
      const insertChauffeur = await db.prepare(
        "INSERT INTO chauffeurs (name, email, phone, passwordHash) VALUES (?, ?, ?, ?)"
      );
      await insertChauffeur.run( "James Mercer", "james@goldridr.com", "+1 (713) 555-0199", defaultPasswordHash );
      await insertChauffeur.run( "Sarah Connor", "sarah@goldridr.com", "+1 (713) 555-0211", defaultPasswordHash );
      await insertChauffeur.run( "Michael Vance", "michael@goldridr.com", "+1 (713) 555-0288", defaultPasswordHash );
    }

    const missingPasswords = await db.prepare(
      "SELECT id FROM chauffeurs WHERE passwordHash IS NULL OR passwordHash = ''"
    ).all() as { id: number }[];
    const setPassword = await db.prepare( "UPDATE chauffeurs SET passwordHash = ? WHERE id = ?" );
    for ( const chauffeur of missingPasswords ) {
      if ( !defaultPassword ) throw new Error( "CHAUFFEUR_DEFAULT_PASSWORD is not configured" );
      await setPassword.run( hashPassword( defaultPassword ), chauffeur.id );
    }
  } catch ( e ) {
    if ( !process.env.NODE_TEST_CONTEXT ) {
      console.error( "Failed to seed chauffeurs:", e );
    }
  }
  initialized = true;
}

export interface VehicleRecord {
  id: number;
  make: string;
  model: string;
  year: number | null;
  colour: string | null;
  plate: string | null;
  status: string;
  createdAt?: string;
}

export interface ChauffeurRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  passwordHash?: string;
  vehicleId?: number | null;
  vehicle?: VehicleRecord | null;
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
  pin?: string | null;
  pinConfirmedAt?: string | null;
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

async function claimDiscountCode(
  db: DatabaseLike,
  code: string
): Promise<DiscountCodeRecord> {
  const normalizedCode = normalizeDiscountCode( code );
  const discount = await db.prepare( "SELECT * FROM discount_codes WHERE code = ?" )
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

  await db.prepare( "UPDATE discount_codes SET redemptions = redemptions + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?" )
    .run( discount.id );
  return { ...discount, redemptions: discount.redemptions + 1 };
}

const CHAUFFEUR_VEHICLE_SELECT = `
  SELECT c.id, c.name, c.email, c.phone, c.status, c.vehicleId,
         v.id AS v_id, v.make AS v_make, v.model AS v_model,
         v.year AS v_year, v.colour AS v_colour, v.plate AS v_plate, v.status AS v_status
  FROM chauffeurs c
  LEFT JOIN vehicles v ON v.id = c.vehicleId
`;

function rowToChauffeur( row: Record<string, unknown> ): ChauffeurRecord {
  const vehicle: VehicleRecord | null = row.v_id != null ? {
    id: row.v_id as number,
    make: row.v_make as string,
    model: row.v_model as string,
    year: row.v_year as number | null,
    colour: row.v_colour as string | null,
    plate: row.v_plate as string | null,
    status: row.v_status as string,
  } : null;
  return {
    id: row.id as number,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    status: row.status as string,
    vehicleId: row.vehicleId as number | null ?? null,
    vehicle,
  };
}

export async function getAllChauffeurs(): Promise<ChauffeurRecord[]> {
  const db = await getDb();
  const rows = await db.prepare(
    `${ CHAUFFEUR_VEHICLE_SELECT } WHERE c.status = 'active' ORDER BY c.name ASC`
  ).all() as Record<string, unknown>[];
  return rows.map( rowToChauffeur );
}

export async function createChauffeur(
  chauffeur: Pick<ChauffeurRecord, "name" | "email" | "phone"> & { password: string }
): Promise<ChauffeurRecord> {
  const db = await getDb();
  const existing = await db.prepare(
    "SELECT id FROM chauffeurs WHERE LOWER(email) = LOWER(?) AND status = 'active'"
  ).get( chauffeur.email ) as { id: number } | undefined;

  if ( existing ) {
    throw new Error( "A chauffeur with this email already exists" );
  }

  const result = await db.prepare(
    "INSERT INTO chauffeurs (name, email, phone, status, passwordHash) VALUES (?, ?, ?, 'active', ?)"
  ).run( chauffeur.name, chauffeur.email, chauffeur.phone || null, hashPassword( chauffeur.password ) );

  const row = await db.prepare(
    `${ CHAUFFEUR_VEHICLE_SELECT } WHERE c.id = ?`
  ).get( result.lastInsertRowid ) as Record<string, unknown>;
  return rowToChauffeur( row );
}

export async function getChauffeurByEmail( email: string ): Promise<ChauffeurRecord | undefined> {
  const db = await getDb();
  return await db.prepare(
    "SELECT * FROM chauffeurs WHERE LOWER(email) = LOWER(?) AND status = 'active'"
  ).get( email ) as ChauffeurRecord | undefined;
}

export async function getChauffeurById( id: number ): Promise<ChauffeurRecord | undefined> {
  const db = await getDb();
  const row = await db.prepare(
    `${ CHAUFFEUR_VEHICLE_SELECT } WHERE c.id = ? AND c.status = 'active'`
  ).get( id ) as Record<string, unknown> | undefined;
  return row ? rowToChauffeur( row ) : undefined;
}

export async function getAllVehicles(): Promise<VehicleRecord[]> {
  return await (await getDb()).prepare(
    "SELECT * FROM vehicles ORDER BY make ASC, model ASC"
  ).all() as VehicleRecord[];
}

export async function getVehicleById( id: number ): Promise<VehicleRecord | undefined> {
  return await (await getDb()).prepare( "SELECT * FROM vehicles WHERE id = ?" ).get( id ) as VehicleRecord | undefined;
}

export async function createVehicle( input: Pick<VehicleRecord, "make" | "model"> & Partial<Pick<VehicleRecord, "year" | "colour" | "plate">> ): Promise<VehicleRecord> {
  const db = await getDb();
  const result = await db.prepare(
    "INSERT INTO vehicles (make, model, year, colour, plate) VALUES (?, ?, ?, ?, ?)"
  ).run( input.make.trim(), input.model.trim(), input.year ?? null, input.colour?.trim() || null, input.plate?.trim() || null );
  return await db.prepare( "SELECT * FROM vehicles WHERE id = ?" ).get( result.lastInsertRowid ) as VehicleRecord;
}

export async function updateVehicle( id: number, updates: Partial<Pick<VehicleRecord, "make" | "model" | "year" | "colour" | "plate" | "status">> ): Promise<boolean> {
  const db = await getDb();
  const existing = await db.prepare( "SELECT * FROM vehicles WHERE id = ?" ).get( id ) as VehicleRecord | undefined;
  if ( !existing ) return false;
  const result = await db.prepare( `
    UPDATE vehicles SET make = ?, model = ?, year = ?, colour = ?, plate = ?, status = ? WHERE id = ?
  ` ).run(
    updates.make?.trim() ?? existing.make,
    updates.model?.trim() ?? existing.model,
    updates.year !== undefined ? updates.year : existing.year,
    updates.colour !== undefined ? updates.colour?.trim() || null : existing.colour,
    updates.plate !== undefined ? updates.plate?.trim() || null : existing.plate,
    updates.status ?? existing.status,
    id
  );
  return result.changes > 0;
}

export async function deleteVehicle( id: number ): Promise<boolean> {
  const db = await getDb();
  await db.prepare( "UPDATE chauffeurs SET vehicleId = NULL WHERE vehicleId = ?" ).run( id );
  const result = await db.prepare( "DELETE FROM vehicles WHERE id = ?" ).run( id );
  return result.changes > 0;
}

export async function assignVehicleToChauffeur( chauffeurId: number | null, vehicleId: number ): Promise<boolean> {
  const db = await getDb();
  return await db.transaction( async () => {
    const vehicle = await db.prepare( "SELECT id FROM vehicles WHERE id = ? AND status = 'active'" ).get( vehicleId );
    if ( !vehicle ) throw new Error( "Vehicle not found or inactive" );
    // Unassign from whoever currently has it
    await db.prepare( "UPDATE chauffeurs SET vehicleId = NULL WHERE vehicleId = ?" ).run( vehicleId );
    if ( chauffeurId !== null ) {
      const result = await db.prepare( "UPDATE chauffeurs SET vehicleId = ? WHERE id = ? AND status = 'active'" )
        .run( vehicleId, chauffeurId );
      return result.changes > 0;
    }
    return true;
  } )() as boolean;
}

export async function unassignVehicle( vehicleId: number ): Promise<void> {
  await (await getDb()).prepare( "UPDATE chauffeurs SET vehicleId = NULL WHERE vehicleId = ?" ).run( vehicleId );
}

export async function getBookingsForChauffeur( chauffeurId: number ): Promise<BookingRecord[]> {
  const db = await getDb();
  return await db.prepare(
    "SELECT * FROM bookings WHERE chauffeurId = ? ORDER BY createdAt DESC"
  ).all( chauffeurId ) as BookingRecord[];
}

export async function deleteChauffeur( id: number ): Promise<boolean> {
  const db = await getDb();
  const remove = db.transaction( async () => {
    const assignedBookings = await db.prepare(
      "SELECT * FROM bookings WHERE chauffeurId = ?"
    ).all( id ) as BookingRecord[];
    const result = await db.prepare(
      "UPDATE chauffeurs SET status = 'inactive' WHERE id = ? AND status = 'active'"
    ).run( id );

    if ( result.changes === 0 ) return false;

    await db.prepare( "UPDATE bookings SET chauffeurId = NULL WHERE chauffeurId = ?" ).run( id );
    for ( const booking of assignedBookings ) {
      await enqueueBookingAssignmentChanged( db, { ...booking, chauffeurId: null }, id );
    }
    await db.prepare( "DELETE FROM blocked_slots WHERE chauffeurId = ?" ).run( id );
    return true;
  } );

  return await remove() as boolean;
}

function generateBookingPin(): string {
  return String( Math.floor( Math.random() * 10000 ) ).padStart( 4, "0" );
}

export async function saveBooking(
  booking: Omit<BookingRecord, "id" | "createdAt"> & { discountCode?: string | null }
): Promise<BookingRecord> {
  const db = await getDb();
  assertFutureBookingTime( booking.date, booking.time, new Date(), await getNotificationTimeZone() );
  const stmt = await db.prepare( `
    INSERT INTO bookings (
      reference, tripType, date, time, duration, name, email, phone, notes, status, tripDetails, chauffeurId,
      smsConsentVersion, smsConsentedAt, pin
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  ` );

  const insert = db.transaction( async () => {
    const tripDetails = parseBookingTripDetails( booking.tripDetails );
    if ( booking.discountCode?.trim() ) {
      const baseAmountCents = Math.round(
        Number( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice ?? 0 ) * 100
      );
      if ( !Number.isFinite( baseAmountCents ) || baseAmountCents <= 0 ) {
        throw new DiscountCodeError( "Discount codes require a quoted booking total" );
      }
      const discount = await claimDiscountCode( db, booking.discountCode );
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

    const pin = booking.pin ?? generateBookingPin();
    await stmt.run(
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
      booking.smsConsentedAt || null,
      pin
    );

    const row = await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( booking.reference ) as BookingRecord;
    await enqueueBookingCreated( db, row );
    return row;
  } );

  return await insert() as BookingRecord;
}

export async function getAllBookings(): Promise<BookingRecord[]> {
  const db = await getDb();
  return await db.prepare( "SELECT * FROM bookings ORDER BY createdAt DESC" ).all() as BookingRecord[];
}

export async function getBookingByReference( reference: string ): Promise<BookingRecord | undefined> {
  const db = await getDb();
  return await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
}

export async function getAllPayments(): Promise<PaymentRecord[]> {
  return await (await getDb()).prepare( `
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

export async function confirmBookingForPaidPayment(
  db: DatabaseLike,
  bookingReference: string
): Promise<boolean> {
  const booking = await db.prepare(
    "SELECT * FROM bookings WHERE reference = ?"
  ).get( bookingReference ) as BookingRecord | undefined;

  if ( !booking ) throw new Error( "Booking not found" );
  assertBookingCanReceivePayment( booking );
  if ( [ "confirmed", "accepted" ].includes( booking.status ) ) return false;

  await db.prepare(
    "UPDATE bookings SET status = 'confirmed' WHERE reference = ?"
  ).run( bookingReference );
  await enqueueBookingStatusChanged( db, { ...booking, status: "confirmed" }, booking.status );
  return true;
}

export async function createPayment( payment: {
  bookingReference: string;
  amountCents: number;
  currency?: string;
  method: string;
  status: string;
  transactionReference?: string | null;
  notes?: string | null;
} ): Promise<PaymentRecord> {
  const db = await getDb();
  const insert = db.transaction( async () => {
    const booking = await db.prepare(
      "SELECT reference, status FROM bookings WHERE reference = ?"
    ).get( payment.bookingReference ) as Pick<BookingRecord, "reference" | "status"> | undefined;
    if ( !booking ) throw new Error( "Booking not found" );
    assertBookingCanReceivePayment( booking );

    const paidAt = payment.status === "paid" ? new Date().toISOString() : null;
    const result = await db.prepare( `
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
      await confirmBookingForPaidPayment( db, payment.bookingReference );
    }

    return await db.prepare( "SELECT * FROM payments WHERE id = ?" )
      .get( result.lastInsertRowid ) as PaymentRecord;
  } );

  return await insert() as PaymentRecord;
}

export async function updatePayment( id: number, updates: {
  amountCents?: number;
  method?: string;
  status?: string;
  transactionReference?: string | null;
  notes?: string | null;
} ): Promise<boolean> {
  const db = await getDb();
  const update = db.transaction( async () => {
    const existing = await db.prepare( "SELECT * FROM payments WHERE id = ?" ).get( id ) as PaymentRecord | undefined;
    if ( !existing ) return false;

    const nextStatus = updates.status ?? existing.status;
    const paidAt = nextStatus === "paid"
      ? existing.paidAt || new Date().toISOString()
      : null;

    const result = await db.prepare( `
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
      await confirmBookingForPaidPayment( db, existing.bookingReference );
    }

    return result.changes > 0;
  } );

  return await update() as boolean;
}

export async function deletePayment( id: number ): Promise<boolean> {
  const result = await (await getDb()).prepare( "DELETE FROM payments WHERE id = ?" ).run( id );
  return result.changes > 0;
}

function generateMockSmsSid(): string {
  return `SM${ Math.random().toString( 36 ).slice( 2, 18 ).toUpperCase().padEnd( 32, "0" ).slice( 0, 32 ) }`;
}

export async function insertMockSmsMessage( input: {
  sid?: string;
  accountSid?: string | null;
  fromNumber: string;
  toNumber: string;
  body: string;
  status?: string;
  errorMessage?: string | null;
} ): Promise<MockSmsMessageRecord> {
  const db = await getDb();
  const sid = input.sid || generateMockSmsSid();
  await db.prepare( `
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
  return await db.prepare( "SELECT * FROM mock_sms_messages WHERE sid = ?" ).get( sid ) as MockSmsMessageRecord;
}

export async function updateMockSmsMessageStatus( sid: string, status: string, errorMessage?: string | null ): Promise<boolean> {
  const db = await getDb();
  const result = await db.prepare( `
    UPDATE mock_sms_messages
    SET status = ?, errorMessage = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE sid = ?
  ` ).run( status, errorMessage || null, sid );
  return result.changes > 0;
}

export async function listMockSmsMessages( limit = 50 ): Promise<MockSmsMessageRecord[]> {
  const db = await getDb();
  return await db.prepare( `
    SELECT * FROM mock_sms_messages
    ORDER BY id DESC
    LIMIT ?
  ` ).all( limit ) as MockSmsMessageRecord[];
}

export async function clearMockSmsMessages(): Promise<number> {
  const db = await getDb();
  const result = await db.prepare( "DELETE FROM mock_sms_messages" ).run();
  return result.changes;
}

export async function confirmBookingPin( reference: string, pin: string ): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  return await db.transaction( async () => {
    const booking = await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking ) return { success: false, error: "Booking not found" };
    if ( !booking.pin ) return { success: false, error: "No PIN set for this booking" };
    if ( booking.pin !== pin ) return { success: false, error: "Invalid PIN. Please try again." };
    await db.prepare(
      "UPDATE bookings SET status = 'confirmed', pinConfirmedAt = CURRENT_TIMESTAMP WHERE reference = ?"
    ).run( reference );
    if ( booking.status !== "confirmed" ) {
      await enqueueBookingStatusChanged( db, { ...booking, status: "confirmed" }, booking.status );
    }
    return { success: true };
  } )() as { success: boolean; error?: string };
}

export async function updateBookingStatus( reference: string, status: string ): Promise<boolean> {
  const db = await getDb();
  return await db.transaction( async () => {
    const booking = await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking || booking.status === status ) return false;
    const result = await db.prepare( "UPDATE bookings SET status = ? WHERE reference = ?" ).run( status, reference );
    await enqueueBookingStatusChanged( db, { ...booking, status }, booking.status );
    return result.changes > 0;
  } )() as boolean;
}

export async function updateBookingChauffeur( reference: string, chauffeurId: number | null ): Promise<boolean> {
  const db = await getDb();
  return await db.transaction( async () => {
    const booking = await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking || booking.chauffeurId === chauffeurId ) return false;
    const result = await db.prepare( "UPDATE bookings SET chauffeurId = ? WHERE reference = ?" ).run( chauffeurId, reference );
    const updatedBooking = { ...booking, chauffeurId };
    await enqueueBookingAssignmentChanged( db, updatedBooking, booking.chauffeurId ?? null );
    if ( chauffeurId ) {
      const conflict = await findBookingConflict( db, updatedBooking );
      if ( conflict ) await enqueueBookingConflict( db, updatedBooking, conflict.reference );
    }
    return result.changes > 0;
  } )() as boolean;
}

export async function updateBookingSchedule(
  reference: string,
  schedule: { date: string; time: string; duration?: number }
): Promise<boolean> {
  const db = await getDb();
  assertFutureBookingTime( schedule.date, schedule.time, new Date(), await getNotificationTimeZone() );
  return await db.transaction( async () => {
    const booking = await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( reference ) as BookingRecord | undefined;
    if ( !booking ) return false;
    const duration = schedule.duration ?? booking.duration;
    if ( booking.date === schedule.date && booking.time === schedule.time && booking.duration === duration ) return false;
    await db.prepare( "UPDATE bookings SET date = ?, time = ?, duration = ? WHERE reference = ?" )
      .run( schedule.date, schedule.time, duration, reference );
    const updatedBooking = { ...booking, date: schedule.date, time: schedule.time, duration };
    await enqueueBookingRescheduled( db, updatedBooking, { date: booking.date, time: booking.time, duration: booking.duration } );
    const conflict = await findBookingConflict( db, updatedBooking );
    if ( conflict ) await enqueueBookingConflict( db, updatedBooking, conflict.reference );
    return true;
  } )() as boolean;
}

async function findBookingConflict( db: DatabaseLike, booking: BookingRecord ): Promise<BookingRecord | undefined> {
  if ( !booking.chauffeurId || [ "cancelled", "rejected" ].includes( booking.status ) ) return undefined;
  const timeZone = await getNotificationTimeZone();
  const candidates = await db.prepare( `
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

export async function deleteBooking( reference: string ): Promise<boolean> {
  const db = await getDb();
  const remove = db.transaction( async () => {
    const booking = await db.prepare(
      "SELECT * FROM bookings WHERE reference = ?"
    ).get( reference ) as BookingRecord | undefined;
    if ( !booking ) return false;

    await enqueueBookingDeleted( db, booking );
    const result = await db.prepare( "DELETE FROM bookings WHERE reference = ?" )
      .run( reference );
    return result.changes > 0;
  } );
  return await remove() as boolean;
}

// ── App settings (key/value) ──────────────────────────────────────────────────
export async function getAppSetting( key: string ): Promise<string | null> {
  const row = await (await getDb()).prepare( "SELECT value FROM app_settings WHERE key = ?" ).get( key ) as { value: string } | undefined;
  return row?.value ?? null;
}

export async function setAppSetting( key: string, value: string ): Promise<void> {
  await (await getDb()).prepare( `
    INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
  ` ).run( key, value );
}

export async function getAllDiscountCodes(): Promise<DiscountCodeRecord[]> {
  return await (await getDb()).prepare( "SELECT * FROM discount_codes ORDER BY createdAt DESC, id DESC" ).all() as DiscountCodeRecord[];
}

export async function getDiscountCodesWithUsage(): Promise<DiscountCodeWithUsage[]> {
  const discountCodes = await getAllDiscountCodes();
  const usageByCode = new Map<string, DiscountUsageRecord[]>();
  const bookings = await (await getDb()).prepare( `
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

export async function getDiscountCodeByCode( code: string ): Promise<DiscountCodeRecord | undefined> {
  const normalized = normalizeDiscountCode( code );
  return await (await getDb()).prepare( "SELECT * FROM discount_codes WHERE code = ?" ).get( normalized ) as DiscountCodeRecord | undefined;
}

export async function createDiscountCode( input: {
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  active?: boolean;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
} ): Promise<DiscountCodeRecord> {
  const db = await getDb();
  const code = normalizeDiscountCode( input.code );
  const result = await db.prepare( `
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
  return await db.prepare( "SELECT * FROM discount_codes WHERE id = ?" ).get( result.lastInsertRowid ) as DiscountCodeRecord;
}

export async function updateDiscountCode(
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
): Promise<boolean> {
  const db = await getDb();
  const existing = await db.prepare( "SELECT * FROM discount_codes WHERE id = ?" ).get( id ) as DiscountCodeRecord | undefined;
  if ( !existing ) return false;

  const nextCode = updates.code !== undefined ? normalizeDiscountCode( updates.code ) : existing.code;
  const nextLabel = updates.label !== undefined ? updates.label.trim() : existing.label;
  const nextKind = updates.kind ?? existing.kind;
  const nextValue = updates.value ?? existing.value;
  const nextActive = updates.active !== undefined ? ( updates.active ? 1 : 0 ) : existing.active;
  const nextMaxRedemptions = updates.maxRedemptions !== undefined ? updates.maxRedemptions : existing.maxRedemptions;
  const nextExpiresAt = updates.expiresAt !== undefined ? updates.expiresAt : existing.expiresAt;

  const result = await db.prepare( `
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

export async function deleteDiscountCode( id: number ): Promise<boolean> {
  const result = await (await getDb()).prepare( "DELETE FROM discount_codes WHERE id = ?" ).run( id );
  return result.changes > 0;
}

export const DEFAULT_BOOKING_BUFFER_MINUTES = 30;

/** Minimum turnaround gap required between two rides for the same chauffeur. */
export async function getBookingBufferMinutes(): Promise<number> {
  const raw = await getAppSetting( "bookingBufferMinutes" );
  const parsed = raw === null ? NaN : Number( raw );
  return Number.isFinite( parsed ) && parsed >= 0 ? parsed : DEFAULT_BOOKING_BUFFER_MINUTES;
}

export async function checkBookingClash(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): Promise<{ clash: boolean; conflictingBooking?: BookingRecord }> {
  try {
    const db = await getDb();
    const timeZone = await getNotificationTimeZone();
    
    // Any booking that hasn't been explicitly killed holds its slot —
    // pending requests must block too, or the same hour can be sold twice
    // before an admin confirms.
    let bookingsOnDate: BookingRecord[];
    if ( chauffeurId !== undefined && chauffeurId !== null ) {
      bookingsOnDate = await db.prepare(
        "SELECT * FROM bookings WHERE date = ? AND chauffeurId = ? AND status NOT IN ('cancelled', 'rejected')"
      ).all( date, chauffeurId ) as BookingRecord[];
    } else {
      bookingsOnDate = await db.prepare(
        "SELECT * FROM bookings WHERE date = ? AND status NOT IN ('cancelled', 'rejected')"
      ).all( date ) as BookingRecord[];
    }

    const requestedStart = zonedDateTimeToDate( date, time, timeZone ).getTime();
    const requestedEnd = requestedStart + durationMinutes * 60 * 1000;
    // Rides need turnaround time between them, so each existing booking
    // occupies its slot plus the configured buffer on both sides.
    const bufferMs = await getBookingBufferMinutes() * 60 * 1000;

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

export async function saveBlockedSlot( block: Omit<BlockedSlotRecord, "id" | "createdAt"> ): Promise<BlockedSlotRecord> {
  const db = await getDb();
  const stmt = await db.prepare( `
    INSERT INTO blocked_slots (
      title, date, endDate, isFullDay, time, duration, recurring, chauffeurId
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  ` );
  await stmt.run( 
    block.title, 
    block.date, 
    block.endDate || null, 
    block.isFullDay ?? 0, 
    block.time, 
    block.duration, 
    block.recurring,
    block.chauffeurId || null
  );
  const row = await db.prepare( "SELECT * FROM blocked_slots ORDER BY id DESC LIMIT 1" ).get() as BlockedSlotRecord;
  return row;
}

export async function getAllBlockedSlots(): Promise<BlockedSlotRecord[]> {
  const db = await getDb();
  return await db.prepare( "SELECT * FROM blocked_slots ORDER BY id DESC" ).all() as BlockedSlotRecord[];
}

export async function getBlockedSlotsForChauffeur( chauffeurId: number ): Promise<BlockedSlotRecord[]> {
  const db = await getDb();
  return await db.prepare(
    "SELECT * FROM blocked_slots WHERE chauffeurId IS NULL OR chauffeurId = ? ORDER BY id DESC"
  ).all( chauffeurId ) as BlockedSlotRecord[];
}

export async function deleteBlockedSlot( id: number ): Promise<boolean> {
  const db = await getDb();
  const stmt = await db.prepare( "DELETE FROM blocked_slots WHERE id = ?" );
  const result = await stmt.run( id );
  return result.changes > 0;
}

export async function deleteChauffeurBlockedSlot( id: number, chauffeurId: number ): Promise<boolean> {
  const db = await getDb();
  const result = await db.prepare(
    "DELETE FROM blocked_slots WHERE id = ? AND chauffeurId = ?"
  ).run( id, chauffeurId );
  return result.changes > 0;
}

export async function checkBlockedClash(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): Promise<{ clash: boolean; conflictingBlock?: BlockedSlotRecord }> {
  try {
    const db = await getDb();
    const timeZone = await getNotificationTimeZone();
    let blocks: BlockedSlotRecord[];

    if ( chauffeurId !== undefined && chauffeurId !== null ) {
      blocks = await db.prepare( "SELECT * FROM blocked_slots WHERE chauffeurId IS NULL OR chauffeurId = ?" ).all( chauffeurId ) as BlockedSlotRecord[];
    } else {
      blocks = await db.prepare( "SELECT * FROM blocked_slots" ).all() as BlockedSlotRecord[];
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

export async function findAvailableChauffeur(
  date: string,
  time: string,
  durationMinutes: number
): Promise<ChauffeurRecord | null> {
  const chauffeurs = await getAllChauffeurs();
  for ( const c of chauffeurs ) {
    const bClash = await checkBookingClash( date, time, durationMinutes, c.id );
    if ( bClash.clash ) continue;

    const blockClash = await checkBlockedClash( date, time, durationMinutes, c.id );
    if ( blockClash.clash ) continue;

    // Chauffeur is completely available!
    return c;
  }
  return null;
}
