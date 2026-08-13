import assert from "node:assert/strict";
import test from "node:test";
import { decryptPaymentCredential, encryptPaymentCredential } from "../src/lib/payments/credential-crypto";

test( "payment credentials are encrypted and authenticated", () => {
  const credential = "sk_test_example_secret";
  const encrypted = encryptPaymentCredential( credential, "settings-encryption-secret" );
  assert.equal( encrypted.includes( credential ), false );
  assert.equal( decryptPaymentCredential( encrypted, "settings-encryption-secret" ), credential );

  const parts = encrypted.split( ":" );
  const payload = Buffer.from( parts[ 3 ], "base64url" );
  payload[ 0 ] ^= 1;
  const tampered = [ ...parts.slice( 0, 3 ), payload.toString( "base64url" ) ].join( ":" );
  assert.throws( () => decryptPaymentCredential( tampered, "settings-encryption-secret" ) );
} );
