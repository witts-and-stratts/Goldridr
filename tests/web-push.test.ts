import assert from "node:assert/strict";
import test from "node:test";
import { paymentNotificationFor } from "@/lib/notifications/payment-events";
import {
  isStaleWebPushError,
  isTransientWebPushError,
  transmitWebPush,
  webPushSubscriptionSchema,
} from "@/lib/notifications/web-push-shared";
import { foregroundNotificationDetails } from "@/lib/notifications/foreground";

test("Web Push subscriptions require HTTPS endpoints and encryption keys", () => {
  const valid = {
    endpoint: "https://push.example.com/subscriptions/123",
    expirationTime: null,
    keys: { p256dh: "p".repeat( 65 ), auth: "a".repeat( 16 ) },
  };
  assert.equal( webPushSubscriptionSchema.safeParse( valid ).success, true );
  assert.equal( webPushSubscriptionSchema.safeParse( { ...valid, endpoint: "http://push.example.com/123" } ).success, false );
  assert.equal( webPushSubscriptionSchema.safeParse( { ...valid, keys: { p256dh: "short", auth: "short" } } ).success, false );
} );

test("Web Push classifies stale and retryable provider failures", () => {
  assert.equal( isStaleWebPushError( { statusCode: 404 } ), true );
  assert.equal( isStaleWebPushError( { statusCode: 410 } ), true );
  assert.equal( isTransientWebPushError( { statusCode: 429 } ), true );
  assert.equal( isTransientWebPushError( { statusCode: 503 } ), true );
  assert.equal( isTransientWebPushError( { statusCode: 403 } ), false );
} );

test("Web Push serializes and accepts a successful provider delivery", async () => {
  let serialized = "";
  const result = await transmitWebPush(
    {
      endpoint: "https://push.example.com/subscriptions/123",
      expirationTime: null,
      keys: { p256dh: "p".repeat( 65 ), auth: "a".repeat( 16 ) },
    },
    {
      title: "New booking",
      body: "Booking GR-2026-17 was received.",
      recipientId: 21,
      url: "/admin/notifications?item=21",
    },
    {
      async sendNotification( _subscription, payload ) {
        serialized = payload;
        return { statusCode: 201, body: "Created", headers: {} };
      },
    },
    "subscription-123",
  );
  assert.equal( JSON.parse( serialized ).recipientId, 21 );
  assert.equal( result.provider, "web-push" );
  assert.equal( result.accepted[ 0 ], "https://push.example.com/subscriptions/123" );
  assert.equal( result.metadata.statusCode, 201 );
} );

test("payment notification events cover every actionable transition with deterministic keys", () => {
  const statuses = [ "awaiting_verification", "paid", "failed", "refunded", "expired" ] as const;
  for ( const status of statuses ) {
    const input = { id: 17, bookingReference: "GR-2026-17", status };
    const first = paymentNotificationFor( input );
    const second = paymentNotificationFor( input );
    assert.equal( first.type, `payment.${ status }` );
    assert.equal( first.eventKey, `payment:17:${ status }` );
    assert.equal( first.eventKey, second.eventKey );
    assert.ok( first.title.includes( "GR-2026-17" ) );
    assert.ok( first.body.length > 10 );
  }
} );

test("foreground notifications use stable toast IDs and deep-link the inbox recipient", () => {
  const notification = foregroundNotificationDetails( {
    recipientId: 1786636226022079,
    title: "  Booking GR-2USPWNGK received  ",
    body: "  Booking request received from Ada.  ",
  } );

  assert.deepEqual( notification, {
    id: "admin-inbox-1786636226022079",
    title: "Booking GR-2USPWNGK received",
    description: "Booking request received from Ada.",
    href: "/admin/notifications?item=1786636226022079",
  } );
  assert.throws(
    () => foregroundNotificationDetails( { recipientId: 0, title: "Test", body: "Test" } ),
    /valid recipient ID/,
  );
} );
