import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import {
  claimDeliveries,
  createManualReminder,
  enqueueBookingAssignmentChanged,
  enqueueBookingCreated,
  enqueueBookingDeleted,
} from "../src/lib/notifications/store";
import type { BookingRecord } from "../src/lib/db";
import type { AuthSession } from "../src/lib/auth";
import { asDatabaseLike } from "./db-like";

const CHAUFFEUR_ID = "7a41f7a2-51f2-40f3-bf40-a078ef1ce68c";

function createDb() {
  const db = new Database( ":memory:" );
  db.exec( `
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY, reference TEXT, tripType TEXT, date TEXT, time TEXT, duration INTEGER,
      name TEXT, email TEXT, phone TEXT, notes TEXT, status TEXT, tripDetails TEXT, chauffeurId TEXT,
      smsConsentVersion TEXT, smsConsentedAt TEXT, createdAt TEXT
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
    CREATE TABLE sms_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customerEmail TEXT, phone TEXT, consentVersion TEXT,
      consentedAt TEXT, revokedAt TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE pocketbase_notification_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notificationId INTEGER NOT NULL UNIQUE,
      attempts INTEGER NOT NULL DEFAULT 0,
      nextAttemptAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      lastError TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  ` );
  return db;
}

const booking: BookingRecord = {
  id: 1,
  reference: "GR-TEST123",
  tripType: "airport",
  date: "2030-06-20",
  time: "10:00",
  duration: 60,
  name: "Test Passenger",
  email: "passenger@example.com",
  phone: "+17135550123",
  notes: "Meet inside arrivals with a name sign.",
  status: "pending",
  tripDetails: JSON.stringify( {
    pickupLocation: "George Bush Intercontinental Airport, Houston",
    dropoffLocation: "The Post Oak Hotel, Houston",
    passengers: 2,
    flightNumber: "UA 1845",
    estimatedTotal: 148,
  } ),
  chauffeurId: CHAUFFEUR_ID,
  smsConsentVersion: "2026-01",
  smsConsentedAt: "2026-06-11T12:00:00.000Z",
  createdAt: "2026-06-11T12:00:00.000Z",
};

test( "booking creation atomically creates in-app, email, SMS reminder, and chauffeur records", async () => {
  const db = createDb();
  db.prepare( "INSERT INTO chauffeurs (id, name, email, phone, status) VALUES (?, 'Driver', 'driver@example.com', '+17135550124', 'active')" ).run( CHAUFFEUR_ID );
  await enqueueBookingCreated( asDatabaseLike( db ), booking );

  const notifications = db.prepare( "SELECT COUNT(*) AS count FROM notifications" ).get() as { count: number };
  const recipients = db.prepare( "SELECT userId FROM notification_recipients ORDER BY userId" ).all() as { userId: string }[];
  const channels = db.prepare( "SELECT channel FROM notification_deliveries ORDER BY channel" ).all() as { channel: string }[];
  const consent = db.prepare( "SELECT consentVersion FROM sms_consents" ).get() as { consentVersion: string };
  const customerDelivery = db.prepare(
    "SELECT payload FROM notification_deliveries WHERE template = 'booking_created'"
  ).get() as { payload: string };
  const creationChannels = db.prepare( `
    SELECT channel
    FROM notification_deliveries
    WHERE template = 'booking_created'
    ORDER BY channel
  ` ).all() as Array<{ channel: string }>;
  const customerPayload = JSON.parse( customerDelivery.payload ) as Record<string, unknown>;

  assert.equal( notifications.count, 2 );
  assert.deepEqual( recipients.map( row => row.userId ), [ "admin", `chauffeur:${ CHAUFFEUR_ID }` ] );
  assert.ok( channels.some( row => row.channel === "email" ) );
  assert.ok( channels.some( row => row.channel === "sms" ) );
  assert.deepEqual( creationChannels.map( row => row.channel ), [ "email", "sms" ] );
  assert.equal( consent.consentVersion, "2026-01" );
  assert.equal( customerPayload.passengerPhone, "+17135550123" );
  assert.deepEqual( customerPayload.tripDetails, {
    pickupLocation: "George Bush Intercontinental Airport, Houston",
    dropoffLocation: "The Post Oak Hotel, Houston",
    passengers: 2,
    flightNumber: "UA 1845",
    estimatedTotal: 148,
  } );
  db.close();
} );

test( "PocketBase mirroring is queued only after notification records exist", async () => {
  const previous = process.env.POCKETBASE_NOTIFICATIONS_WRITE;
  process.env.POCKETBASE_NOTIFICATIONS_WRITE = "true";
  const db = createDb();
  db.prepare( "INSERT INTO chauffeurs (id, name, email, phone, status) VALUES (?, 'Driver', 'driver@example.com', '+17135550124', 'active')" ).run( CHAUFFEUR_ID );
  try {
    await enqueueBookingCreated( asDatabaseLike( db ), booking );
    const queued = db.prepare( `
      SELECT o.notificationId, n.eventKey
      FROM pocketbase_notification_outbox o
      JOIN notifications n ON n.id = o.notificationId
      ORDER BY o.notificationId
    ` ).all() as Array<{ notificationId: number; eventKey: string }>;
    assert.equal( queued.length, 2 );
    assert.ok( queued.every( item => item.notificationId > 0 ) );
    assert.deepEqual( queued.map( item => item.eventKey ), [
      "booking:GR-TEST123:created",
      "booking:GR-TEST123:reminders",
    ] );
  } finally {
    if ( previous === undefined ) delete process.env.POCKETBASE_NOTIFICATIONS_WRITE;
    else process.env.POCKETBASE_NOTIFICATIONS_WRITE = previous;
    db.close();
  }
} );

test( "expired leases can be reclaimed without claiming active leases", async () => {
  const db = createDb();
  db.prepare( `
    INSERT INTO notifications (id, eventKey, type, category, title, body, metadata)
    VALUES (1, 'test', 'test', 'system', 'Test', 'Test', '{}')
  ` ).run();
  const insert = db.prepare( `
    INSERT INTO notification_deliveries
      (notificationId, channel, recipient, template, payload, idempotencyKey, status, scheduledAt, nextAttemptAt, leaseExpiresAt)
    VALUES (1, 'email', ?, 'default', '{}', ?, 'processing', ?, ?, ?)
  ` );
  const past = new Date( Date.now() - 60_000 ).toISOString();
  const future = new Date( Date.now() + 60_000 ).toISOString();
  insert.run( "expired@example.com", "expired", past, past, past );
  insert.run( "active@example.com", "active", past, past, future );

  const claimed = await claimDeliveries( asDatabaseLike( db ), 10, 60_000 );
  assert.equal( claimed.length, 1 );
  assert.equal( claimed[ 0 ].recipient, "expired@example.com" );
  db.close();
} );

test( "React Email renders both HTML and useful plain text", async () => {
  process.env.EMAIL_TRANSPORT = "smtp";
  process.env.EMAIL_FROM_NAME = "Goldridr";
  process.env.EMAIL_FROM_ADDRESS = "notifications@example.com";
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_USER = "test";
  process.env.SMTP_PASSWORD = "test";
  const { renderNotificationEmail } = await import( "../src/lib/notifications/email-template" );
  const rendered = await renderNotificationEmail(
    "booking_created",
    "passenger@example.com",
    {
      bookingReference: "GR-TEST123",
      passengerName: "Test Passenger",
      date: "2030-06-20",
      time: "10:00",
      tripType: "airport",
      notes: "Meet inside arrivals with a name sign.",
      appUrl: "https://goldridr.example",
      tripDetails: {
        pickupLocation: "George Bush Intercontinental Airport, Houston",
        dropoffLocation: "The Post Oak Hotel, Houston",
        passengers: 2,
        flightNumber: "UA 1845",
        estimatedTotal: 148,
      },
    },
    "test-key"
  );
  assert.match( rendered.html, /Booking request received/ );
  assert.match( rendered.html, /goldridr-logo-email\.png/ );
  assert.match( rendered.html, /Your trip QR code/ );
  assert.match( rendered.html, /\/api\/booking\/qr\?reference=GR-TEST123(?:&|&amp;)email=passenger%40example\.com/ );
  assert.match( rendered.html, /\/verify\?reference=GR-TEST123(?:&|&amp;)email=passenger%40example\.com/ );
  assert.match( rendered.html, /QR code for booking GR-TEST123/ );
  assert.match( rendered.html, /email-pickup\.png/ );
  assert.match( rendered.html, /email-dropoff\.png/ );
  assert.match( rendered.html, /background-color:#050505/ );
  assert.match( rendered.html, /background-color:#1a1a18/ );
  assert.match( rendered.html, /George Bush Intercontinental Airport/ );
  assert.match( rendered.html, /The Post Oak Hotel/ );
  assert.match( rendered.html, /UA 1845/ );
  assert.match( rendered.html, /\$148\.00/ );
  assert.match( rendered.text, /Meet inside arrivals with a name sign/ );
  assert.match( rendered.text, /GR-TEST123/ );
  assert.equal( rendered.to[ 0 ], "passenger@example.com" );
} );

test( "confirmed booking email reuses the complete booking card", async () => {
  const { renderNotificationEmail } = await import( "../src/lib/notifications/email-template" );
  const rendered = await renderNotificationEmail(
    "booking_status",
    "passenger@example.com",
    {
      bookingReference: "GR-CONFIRMED",
      passengerName: "Test Passenger",
      status: "confirmed",
      date: "2030-06-20",
      time: "10:00",
      tripType: "airport",
      notes: "Meet inside arrivals with a name sign.",
      appUrl: "https://goldridr.example",
      tripDetails: {
        pickupLocation: "George Bush Intercontinental Airport, Houston",
        dropoffLocation: "The Post Oak Hotel, Houston",
        passengers: 2,
        flightNumber: "UA 1845",
        estimatedTotal: 148,
      },
    },
    "confirmed-test-key"
  );

  assert.equal( rendered.subject, "Booking GR-CONFIRMED confirmed" );
  assert.match( rendered.html, /Booking confirmed/ );
  assert.match( rendered.html, />Confirmed</ );
  assert.match( rendered.html, /email-pickup\.png/ );
  assert.match( rendered.html, /email-dropoff\.png/ );
  assert.match( rendered.html, /George Bush Intercontinental Airport/ );
  assert.match( rendered.html, /The Post Oak Hotel/ );
  assert.match( rendered.html, /UA 1845/ );
  assert.match( rendered.html, /\$148\.00/ );
  assert.match( rendered.html, /Your trip QR code/ );
  assert.match( rendered.text, /Meet inside arrivals with a name sign/ );
} );

test( "chauffeur notification emails do not include the rider QR code", async () => {
  const { renderNotificationEmail } = await import( "../src/lib/notifications/email-template" );
  const rendered = await renderNotificationEmail(
    "chauffeur_assignment",
    "driver@example.com",
    {
      bookingReference: "GR-DRIVER",
      passengerName: "Test Passenger",
      passengerEmail: "passenger@example.com",
      date: "2030-06-20",
      time: "10:00",
      appUrl: "https://goldridr.example",
    },
    "driver-test-key"
  );

  assert.doesNotMatch( rendered.html, /Your trip QR code/ );
  assert.doesNotMatch( rendered.html, /\/api\/booking\/qr/ );
} );

test( "every rider trip email template includes the booking QR code", async () => {
  process.env.EMAIL_TRANSPORT = "smtp";
  process.env.EMAIL_FROM_NAME = "Goldridr";
  process.env.EMAIL_FROM_ADDRESS = "notifications@example.com";
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_USER = "test";
  process.env.SMTP_PASSWORD = "test";
  const { renderNotificationEmail } = await import( "../src/lib/notifications/email-template" );
  const templates = [
    "booking_created",
    "booking_status",
    "booking_reminder",
    "booking_assignment",
    "booking_deleted",
    "manual_message",
  ];

  for ( const template of templates ) {
    const rendered = await renderNotificationEmail(
      template,
      "passenger@example.com",
      {
        bookingReference: "GR-ALLQR",
        passengerName: "Test Passenger",
        passengerEmail: "passenger@example.com",
        date: "2030-06-20",
        time: "10:00",
        status: "confirmed",
        action: "assigned",
        chauffeurName: "Driver",
        subject: "Trip update",
        message: "Your trip details were updated.",
        appUrl: "https://goldridr.example",
      },
      `all-qr-${ template }`
    );

    assert.match( rendered.html, /Your trip QR code/, template );
    assert.match( rendered.html, /\/api\/booking\/qr\?reference=GR-ALLQR/, template );
  }
} );

test( "manual reminders create auditable customer and chauffeur deliveries", async () => {
  const db = createDb();
  db.prepare( "INSERT INTO chauffeurs (id, name, email, phone, status) VALUES (?, 'Driver', 'driver@example.com', '+17135550124', 'active')" ).run( CHAUFFEUR_ID );
  const session: AuthSession = {
    role: "admin",
    userId: "admin",
    name: "Dispatcher",
    email: "admin@example.com",
    expiresAt: Math.floor( Date.now() / 1000 ) + 3600,
  };
  const notificationId = await createManualReminder( asDatabaseLike( db ), session, booking, [ "email", "sms" ] );
  const deliveries = db.prepare(
    "SELECT channel, recipient, template FROM notification_deliveries WHERE notificationId = ? ORDER BY recipient"
  ).all( notificationId ) as Array<{ channel: string; recipient: string; template: string }>;

  assert.deepEqual( deliveries, [
    { channel: "sms", recipient: "+17135550123", template: "booking_reminder" },
    { channel: "email", recipient: "driver@example.com", template: "chauffeur_reminder" },
    { channel: "email", recipient: "passenger@example.com", template: "booking_reminder" },
  ] );
  db.close();
} );

test( "booking assignment changes notify the customer and affected chauffeurs", async () => {
  const db = createDb();
  db.prepare( "INSERT INTO chauffeurs (id, name, email, phone, status) VALUES (?, 'Driver', 'driver@example.com', '+17135550124', 'active')" ).run( CHAUFFEUR_ID );

  await enqueueBookingAssignmentChanged( asDatabaseLike( db ), booking, null );

  const recipients = db.prepare(
    "SELECT userId FROM notification_recipients ORDER BY userId"
  ).all() as Array<{ userId: string }>;
  const deliveries = db.prepare( `
    SELECT channel, recipient, template
    FROM notification_deliveries
    ORDER BY recipient, channel
  ` ).all() as Array<{ channel: string; recipient: string; template: string }>;

  assert.deepEqual( recipients.map( row => row.userId ), [ "admin", `chauffeur:${ CHAUFFEUR_ID }` ] );
  assert.deepEqual( deliveries, [
    { channel: "sms", recipient: "+17135550123", template: "booking_assignment" },
    { channel: "email", recipient: "driver@example.com", template: "chauffeur_assignment" },
    { channel: "email", recipient: "passenger@example.com", template: "booking_assignment" },
  ] );
  db.close();
} );

test( "booking deletion notifies all parties and cancels pending reminders", async () => {
  const db = createDb();
  db.prepare( "INSERT INTO chauffeurs (id, name, email, phone, status) VALUES (?, 'Driver', 'driver@example.com', '+17135550124', 'active')" ).run( CHAUFFEUR_ID );
  await enqueueBookingCreated( asDatabaseLike( db ), booking );

  await enqueueBookingDeleted( asDatabaseLike( db ), booking );

  const deletion = db.prepare(
    "SELECT id, type FROM notifications WHERE type = 'booking.deleted'"
  ).get() as { id: number; type: string };
  const recipients = db.prepare(
    "SELECT userId FROM notification_recipients WHERE notificationId = ? ORDER BY userId"
  ).all( deletion.id ) as Array<{ userId: string }>;
  const deliveries = db.prepare( `
    SELECT channel, recipient, template
    FROM notification_deliveries
    WHERE notificationId = ?
    ORDER BY recipient, channel
  ` ).all( deletion.id ) as Array<{ channel: string; recipient: string; template: string }>;
  const pendingReminders = db.prepare( `
    SELECT COUNT(*) AS count
    FROM notification_deliveries d
    JOIN notifications n ON n.id = d.notificationId
    WHERE n.category = 'reminders' AND d.status = 'pending'
  ` ).get() as { count: number };

  assert.deepEqual( recipients.map( row => row.userId ), [ "admin", `chauffeur:${ CHAUFFEUR_ID }` ] );
  assert.deepEqual( deliveries, [
    { channel: "sms", recipient: "+17135550123", template: "booking_deleted" },
    { channel: "email", recipient: "driver@example.com", template: "chauffeur_unassigned" },
    { channel: "email", recipient: "passenger@example.com", template: "booking_deleted" },
  ] );
  assert.equal( pendingReminders.count, 0 );
  db.close();
} );
