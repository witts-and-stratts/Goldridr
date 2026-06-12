import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/booking/qr/route";
import { getBookingVerifyUrl } from "../src/lib/booking-qr";

test( "booking verification QR route returns an email-compatible PNG", async () => {
  const response = await GET( new Request(
    "http://localhost/api/booking/qr?reference=GR-TEST123&email=passenger%40example.com"
  ) );
  const bytes = new Uint8Array( await response.arrayBuffer() );

  assert.equal( response.status, 200 );
  assert.equal( response.headers.get( "content-type" ), "image/png" );
  assert.deepEqual( Array.from( bytes.slice( 0, 8 ) ), [ 137, 80, 78, 71, 13, 10, 26, 10 ] );
  assert.ok( bytes.length > 500 );
} );

test( "booking verification URL includes the rider credentials expected by the verify page", () => {
  assert.equal(
    getBookingVerifyUrl( "https://goldridr.example/", "GR-TEST123", "passenger@example.com" ),
    "https://goldridr.example/verify?reference=GR-TEST123&email=passenger%40example.com"
  );
} );
