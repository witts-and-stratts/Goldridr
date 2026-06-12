import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFutureBookingTime,
  getDateStringInTimeZone,
  isBookingTimeInFuture,
  PastBookingTimeError,
} from "../src/lib/booking-time";
import { TownFormSchema } from "../src/lib/form-schemas";
import { POST } from "../src/app/api/booking/route";

const now = new Date( "2026-06-11T18:00:00.000Z" );

test( "booking time validation uses the configured service timezone", () => {
  assert.equal( getDateStringInTimeZone( now, "America/Chicago" ), "2026-06-11" );
  assert.equal( isBookingTimeInFuture( "2026-06-11", "12:59", now, "America/Chicago" ), false );
  assert.equal( isBookingTimeInFuture( "2026-06-11", "13:01", now, "America/Chicago" ), true );
} );

test( "booking time at the current instant is rejected", () => {
  assert.throws(
    () => assertFutureBookingTime( "2026-06-11", "13:00", now, "America/Chicago" ),
    PastBookingTimeError
  );
} );

test( "booking forms reject a past pickup", () => {
  const result = TownFormSchema.safeParse( {
    pickupLocation: "100 Main Street",
    dropoffLocation: "200 Main Street",
    date: new Date( 2020, 0, 1 ),
    time: "12:00",
  } );

  assert.equal( result.success, false );
  assert.equal(
    result.error?.issues.find( issue => issue.path[ 0 ] === "time" )?.message,
    "Pickup date and time must be in the future"
  );
} );

test( "booking API rejects a past pickup before checking availability", async () => {
  const response = await POST( new Request( "http://localhost/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify( {
      date: "2020-01-01",
      time: "10:00",
      duration: 60,
      attendee: {
        name: "Past Rider",
        email: "past@example.com",
        phone: "+17135550123",
      },
      tripType: "city",
      tripDetails: {
        pickupLocation: "Houston, Texas",
        dropoffLocation: "Austin, Texas",
      },
    } ),
  } ) );
  const body = await response.json();

  assert.equal( response.status, 400 );
  assert.equal( body.error, "past_time" );
} );
