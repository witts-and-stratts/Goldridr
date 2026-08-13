import assert from "node:assert/strict";
import test from "node:test";
import { paymentToken, paymentTokenHash } from "@/lib/payments/tokens";

test( "payment links use random high-entropy tokens and persist only deterministic hashes", () => {
  const first = paymentToken();
  const second = paymentToken();

  assert.notEqual( first, second );
  assert.ok( first.length >= 43 );
  assert.match( first, /^[A-Za-z0-9_-]+$/ );
  assert.equal( paymentTokenHash( first ), paymentTokenHash( first ) );
  assert.notEqual( paymentTokenHash( first ), paymentTokenHash( second ) );
  assert.doesNotMatch( paymentTokenHash( first ), new RegExp( first ) );
} );
