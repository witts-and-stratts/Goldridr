import assert from "node:assert/strict";
import test from "node:test";
import { classifyInboundKeyword, normalizePhone } from "../src/lib/notifications/sms-consent";

test( "carrier opt-out keywords revoke consent", () => {
  for ( const keyword of [ "STOP", "stop", " Stop ", "STOPALL", "unsubscribe", "Cancel", "END", "quit" ] ) {
    assert.equal( classifyInboundKeyword( keyword ), "opt_out", `${ keyword } should opt out` );
  }
} );

test( "opt-in and help keywords are distinguished", () => {
  for ( const keyword of [ "START", "unstop", "Yes" ] ) {
    assert.equal( classifyInboundKeyword( keyword ), "opt_in" );
  }
  for ( const keyword of [ "HELP", "info" ] ) {
    assert.equal( classifyInboundKeyword( keyword ), "help" );
  }
} );

test( "ordinary replies are not treated as keywords", () => {
  assert.equal( classifyInboundKeyword( "please stop the car at gate 3" ), "unknown" );
  assert.equal( classifyInboundKeyword( "thanks!" ), "unknown" );
  assert.equal( classifyInboundKeyword( "" ), "unknown" );
} );

test( "E.164 and free-text phone numbers normalize to the same key", () => {
  assert.equal( normalizePhone( "+1 (555) 123-4567" ), normalizePhone( "+15551234567" ) );
  assert.equal( normalizePhone( "555-123-4567" ), normalizePhone( "+15551234567" ) );
  assert.equal( normalizePhone( "+15551234567" ), "5551234567" );
} );
