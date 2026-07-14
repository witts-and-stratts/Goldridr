import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { confirmBookingForPaidPayment } from "../src/lib/db";
import { asDatabaseLike } from "./db-like";

function createDb() {
  const db = new Database( ":memory:" );
  db.exec( `
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY,
      reference TEXT UNIQUE,
      tripType TEXT,
      date TEXT,
      time TEXT,
      duration INTEGER,
      name TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      status TEXT,
      tripDetails TEXT,
      chauffeurId TEXT,
      smsConsentVersion TEXT,
      smsConsentedAt TEXT,
      createdAt TEXT
    );
    CREATE TABLE chauffeurs (
      id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, status TEXT, passwordHash TEXT
    );
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, eventKey TEXT UNIQUE, type TEXT, category TEXT, title TEXT,
      body TEXT, bookingReference TEXT, actorUserId TEXT, metadata TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE notification_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT, notificationId INTEGER, userId TEXT, readAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(notificationId, userId)
    );
    CREATE TABLE notification_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, notificationId INTEGER, channel TEXT, recipient TEXT,
      template TEXT, payload TEXT, idempotencyKey TEXT UNIQUE, status TEXT DEFAULT 'pending',
      scheduledAt TEXT, nextAttemptAt TEXT, attempts INTEGER DEFAULT 0, leaseToken TEXT, leaseExpiresAt TEXT,
      provider TEXT, providerMessageId TEXT, accepted TEXT, rejected TEXT, response TEXT,
      providerMetadata TEXT, lastError TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE notification_preferences (
      userId TEXT, category TEXT, inApp INTEGER, email INTEGER, sms INTEGER, updatedAt TEXT,
      PRIMARY KEY(userId, category)
    );
  ` );
  db.prepare( `
    INSERT INTO bookings (
      id, reference, tripType, date, time, duration, name, email, phone, notes,
      status, tripDetails, chauffeurId, createdAt
    ) VALUES (
      1, 'GR-PAYMENT', 'city', '2030-06-20', '10:00', 60, 'Test Passenger',
      'passenger@example.com', '', '', 'pending', '{}', NULL, CURRENT_TIMESTAMP
    )
  ` ).run();
  return db;
}

test( "a paid payment confirms its pending booking and queues the status notification", async () => {
  const db = createDb();

  const changed = await confirmBookingForPaidPayment( asDatabaseLike( db ), "GR-PAYMENT" );

  const booking = db.prepare(
    "SELECT status FROM bookings WHERE reference = 'GR-PAYMENT'"
  ).get() as { status: string };
  const notification = db.prepare( `
    SELECT type, bookingReference
    FROM notifications
    WHERE bookingReference = 'GR-PAYMENT'
  ` ).get() as { type: string; bookingReference: string };

  assert.equal( changed, true );
  assert.equal( booking.status, "confirmed" );
  assert.equal( notification.type, "booking.confirmed" );
  assert.equal( notification.bookingReference, "GR-PAYMENT" );
  db.close();
} );

test( "an already confirmed booking is not confirmed or notified twice", async () => {
  const db = createDb();
  db.prepare(
    "UPDATE bookings SET status = 'confirmed' WHERE reference = 'GR-PAYMENT'"
  ).run();

  const changed = await confirmBookingForPaidPayment( asDatabaseLike( db ), "GR-PAYMENT" );
  const notifications = db.prepare(
    "SELECT COUNT(*) AS count FROM notifications"
  ).get() as { count: number };

  assert.equal( changed, false );
  assert.equal( notifications.count, 0 );
  db.close();
} );

test( "a cancelled booking cannot be confirmed by recording a paid payment", async () => {
  const db = createDb();
  db.prepare(
    "UPDATE bookings SET status = 'cancelled' WHERE reference = 'GR-PAYMENT'"
  ).run();

  await assert.rejects(
    () => confirmBookingForPaidPayment( asDatabaseLike( db ), "GR-PAYMENT" ),
    /Cannot record a payment for a cancelled booking/
  );

  const booking = db.prepare(
    "SELECT status FROM bookings WHERE reference = 'GR-PAYMENT'"
  ).get() as { status: string };
  const notifications = db.prepare(
    "SELECT COUNT(*) AS count FROM notifications"
  ).get() as { count: number };

  assert.equal( booking.status, "cancelled" );
  assert.equal( notifications.count, 0 );
  db.close();
} );
