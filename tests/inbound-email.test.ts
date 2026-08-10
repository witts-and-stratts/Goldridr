import assert from "node:assert/strict";
import test from "node:test";
import { extractReplyText } from "@/lib/notifications/inbound-email";
import { selectedInboundTransport } from "@/lib/notifications/inbound-email-receiver";

test( "extractReplyText keeps only the reply above an Apple Mail quote", () => {
  const body = "This is my own return reply. Let’s see if you get it\n\nOn 24 Jul 2026, at 11:15 AM, GoldRidr<info@goldridr.com> wrote:\n\nTesting replies\n\u200b\u200c\u200d";
  assert.equal( extractReplyText( body, "Re: Testing replies" ), "This is my own return reply. Let’s see if you get it" );
} );

test( "extractReplyText removes Outlook-style original message blocks", () => {
  const body = "Please move my pickup to noon.\n\n-----Original Message-----\nFrom: GoldRidr<info@goldridr.com>\nSent: Thursday, July 24, 2026 11:15 AM";
  assert.equal( extractReplyText( body, "Re: Pickup" ), "Please move my pickup to noon." );
} );

test( "auto-selects the Mailpit inbound receiver for the Mailpit delivery transport", () => {
  const originalDeliveryTransport = process.env.EMAIL_TRANSPORT;
  const originalInboundTransport = process.env.EMAIL_INBOUND_TRANSPORT;
  process.env.EMAIL_TRANSPORT = "mailpit";
  delete process.env.EMAIL_INBOUND_TRANSPORT;
  try {
    assert.equal( selectedInboundTransport(), "mailpit" );
  } finally {
    if ( originalDeliveryTransport === undefined ) delete process.env.EMAIL_TRANSPORT;
    else process.env.EMAIL_TRANSPORT = originalDeliveryTransport;
    if ( originalInboundTransport === undefined ) delete process.env.EMAIL_INBOUND_TRANSPORT;
    else process.env.EMAIL_INBOUND_TRANSPORT = originalInboundTransport;
  }
} );
