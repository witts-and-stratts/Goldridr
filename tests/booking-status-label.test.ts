import assert from "node:assert/strict";
import test from "node:test";
import { formatBookingStatus } from "@/lib/booking-status-label";

test( "booking statuses use human-readable title case", () => {
  assert.equal( formatBookingStatus( "pending_payment" ), "Pending Payment" );
  assert.equal( formatBookingStatus( "payment_review" ), "Payment Review" );
  assert.equal( formatBookingStatus( "payment_expired" ), "Payment Expired" );
  assert.equal( formatBookingStatus( "confirmed" ), "Confirmed" );
  assert.equal( formatBookingStatus( "accepted" ), "Accepted" );
  assert.equal( formatBookingStatus( "cancelled" ), "Cancelled" );
  assert.equal( formatBookingStatus( "rejected" ), "Rejected" );
} );

test( "booking status formatting handles future values and empty input", () => {
  assert.equal( formatBookingStatus( "driver_en_route" ), "Driver En Route" );
  assert.equal( formatBookingStatus( "awaiting-driver" ), "Awaiting Driver" );
  assert.equal( formatBookingStatus( "" ), "Unknown" );
} );
