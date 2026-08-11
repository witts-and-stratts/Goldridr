import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeWebhookRawBody, sanitizeWebhookValue } from "@/lib/notifications/webhook-logs";
import { buildMessageThreads, riderKeyFor } from "@/app/admin/notifications/lib/message-threads";
import type { NotificationItem } from "@/app/admin/notifications/types";

function notification( overrides: Partial<NotificationItem> = {} ): NotificationItem {
  return {
    id: 1,
    recipientId: 2,
    eventKey: "message.inbound_sms:twilio:SM1",
    type: "message.inbound_sms",
    category: "messages",
    title: "SMS from +15551234567",
    body: "Can you move my pickup?",
    metadata: JSON.stringify( {
      direction: "inbound",
      channel: "sms",
      sender: "+15551234567",
      passengerPhone: "+15551234567",
      passengerName: "Unknown sender",
      matched: false,
    } ),
    readAt: null,
    createdAt: "2026-08-11T10:00:00.000Z",
    bookingReference: null,
    ...overrides,
  };
}

test( "webhook sanitizer recursively redacts secrets while preserving operational fields", () => {
  assert.deepEqual(
    sanitizeWebhookValue( {
      Body: "Please update my ride",
      From: "+15551234567",
      nested: { apiKey: "secret-value", Authorization: "Bearer private", eventId: "evt_1" },
    } ),
    {
      Body: "Please update my ride",
      From: "+15551234567",
      nested: { apiKey: "[REDACTED]", Authorization: "[REDACTED]", eventId: "evt_1" },
    }
  );
} );

test( "raw webhook sanitizer redacts JSON and form-encoded credentials", () => {
  const raw = 'token=abc123&Body=hello&signature=private&payload={"secret":"hidden"}';
  const sanitized = sanitizeWebhookRawBody( raw );
  assert.doesNotMatch( sanitized, /abc123|private|hidden/ );
  assert.match( sanitized, /Body=hello/ );
} );

test( "unmatched inbound SMS creates a phone-keyed non-replyable thread", () => {
  const item = notification();
  assert.equal( riderKeyFor( item ), "sms:15551234567" );
  const { threads } = buildMessageThreads( [ item ], "" );
  assert.equal( threads.length, 1 );
  assert.equal( threads[ 0 ].unmatchedSms, true );
  assert.equal( threads[ 0 ].riderPhone, "+15551234567" );
} );

test( "linked inbound SMS merges into the rider email thread", () => {
  const item = notification( {
    bookingReference: "GR-100",
    metadata: JSON.stringify( {
      direction: "inbound",
      channel: "sms",
      sender: "+15551234567",
      passengerPhone: "+15551234567",
      passengerName: "Avery Rider",
      passengerEmail: "avery@example.com",
      matched: true,
    } ),
  } );
  assert.equal( riderKeyFor( item ), "avery@example.com" );
  const { threads } = buildMessageThreads( [ item ], "" );
  assert.equal( threads[ 0 ].unmatchedSms, false );
  assert.equal( threads[ 0 ].bookingReference, "GR-100" );
} );
