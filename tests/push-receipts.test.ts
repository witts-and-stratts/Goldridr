import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { processPushReceipts, sendPushToUsers } from "../src/lib/notifications/push";
import { asDatabaseLike } from "./db-like";

function createDb() {
  const db = new Database( ":memory:" );
  db.exec( `
    CREATE TABLE push_tokens (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      platform TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE push_receipts (
      ticketId TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      nextCheckAt TEXT NOT NULL,
      receipt TEXT,
      lastError TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  ` );
  return db;
}

test( "Expo push tickets are persisted for later receipt checks", async () => {
  const db = createDb();
  const token = "ExponentPushToken[test-token]";
  db.prepare( "INSERT INTO push_tokens (token, userId, platform) VALUES (?, 'admin', 'ios')" ).run( token );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response( JSON.stringify( {
    data: [ { status: "ok", id: "ticket-1" } ],
  } ), { status: 200, headers: { "Content-Type": "application/json" } } );

  try {
    await sendPushToUsers( asDatabaseLike( db ), [ "admin" ], { title: "Test", body: "Body" } );
    const receipt = db.prepare( "SELECT ticketId, token, status FROM push_receipts" ).get() as {
      ticketId: string;
      token: string;
      status: string;
    };
    assert.deepEqual( receipt, { ticketId: "ticket-1", token, status: "pending" } );
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
} );

test( "DeviceNotRegistered receipts remove invalid Expo tokens", async () => {
  const db = createDb();
  const token = "ExponentPushToken[expired-token]";
  db.prepare( "INSERT INTO push_tokens (token, userId, platform) VALUES (?, 'admin', 'ios')" ).run( token );
  db.prepare( `
    INSERT INTO push_receipts (ticketId, token, nextCheckAt)
    VALUES ('ticket-expired', ?, datetime('now', '-1 minute'))
  ` ).run( token );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response( JSON.stringify( {
    data: {
      "ticket-expired": {
        status: "error",
        message: "The device is no longer registered",
        details: { error: "DeviceNotRegistered" },
      },
    },
  } ), { status: 200, headers: { "Content-Type": "application/json" } } );

  try {
    const result = await processPushReceipts( asDatabaseLike( db ) );
    assert.deepEqual( result, { checked: 1, delivered: 0, failed: 1 } );
    const tokenCount = db.prepare( "SELECT COUNT(*) AS count FROM push_tokens" ).get() as { count: number };
    const receipt = db.prepare( "SELECT status FROM push_receipts" ).get() as { status: string };
    assert.equal( tokenCount.count, 0 );
    assert.equal( receipt.status, "failed" );
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
} );
