import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../src/app/api/booking/route";
import { bookingRecordToResponses } from "../src/lib/booking-data";
import { UnifiedBookingSchema } from "../src/lib/form-schemas";

test( "airport form requires a terminal" , () => {
  const result = UnifiedBookingSchema.safeParse( {
    serviceType: "airport",
    flightNumber: "UA1234",
    terminal: "",
    passengers: "1",
    luggage: "1",
    duration: "",
    pickupLocation: "Houston Intercontinental Airport",
    dropoffLocation: "100 Main Street, Houston",
    date: new Date( "2099-06-11T00:00:00" ),
    time: "13:01",
  } );

  assert.equal( result.success, false );
  assert.equal( result.error?.issues.find( issue => issue.path[ 0 ] === "terminal" )?.message, "Terminal is required" );
} );

test( "airport booking API rejects a missing terminal before database work" , async () => {
  const response = await POST( new Request( "http://localhost/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify( {
      date: "2099-06-11",
      time: "13:01",
      attendee: { name: "Airport Rider", email: "airport@example.com" },
      tripType: "airport",
      tripDetails: {
        pickupLocation: "Houston Intercontinental Airport",
        dropoffLocation: "100 Main Street, Houston",
        flightNumber: "UA1234",
      },
    } ),
  } ) );
  const body = await response.json();

  assert.equal( response.status, 400 );
  assert.equal( body.error, "Validation failed" );
  assert.match( body.details, /Terminal is required for airport bookings/ );
} );

test( "booking response exposes the stored airport terminal" , () => {
  const responses = bookingRecordToResponses( {
    id: 1,
    reference: "GR-TERM",
    tripType: "airport",
    date: "2099-06-11",
    time: "13:01",
    duration: 60,
    name: "Airport Rider",
    email: "airport@example.com",
    phone: "",
    notes: "",
    status: "pending",
    tripDetails: JSON.stringify( { terminal: "Terminal A" } ),
    createdAt: "2099-01-01T00:00:00.000Z",
  } );

  assert.equal( responses.terminal, "Terminal A" );
} );
