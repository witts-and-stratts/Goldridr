import assert from "node:assert/strict";
import test from "node:test";
import { createEmailOpenTrackingUrl, trackedDeliveryId } from "@/lib/notifications/email-open-tracking";

test( "email tracking URLs contain a valid signed delivery ID", async () => {
  const oldSecret = process.env.EMAIL_TRACKING_SECRET;
  const oldUrl = process.env.APP_URL;
  process.env.EMAIL_TRACKING_SECRET = "test-tracking-secret";
  process.env.APP_URL = "https://example.com";
  try {
    const url = await createEmailOpenTrackingUrl( 42 );
    const token = url.split( "/" ).at( -1 ) || "";
    assert.equal( trackedDeliveryId( token ), 42 );
    assert.equal( trackedDeliveryId( `${ token }x` ), null );
  } finally {
    if ( oldSecret === undefined ) delete process.env.EMAIL_TRACKING_SECRET;
    else process.env.EMAIL_TRACKING_SECRET = oldSecret;
    if ( oldUrl === undefined ) delete process.env.APP_URL;
    else process.env.APP_URL = oldUrl;
  }
} );
