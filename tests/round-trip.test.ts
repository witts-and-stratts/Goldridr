import assert from "node:assert/strict";
import test from "node:test";
import { BookingRequestSchema } from "../src/lib/booking-create";
import { UnifiedBookingSchema } from "../src/lib/form-schemas";
import { roundTripLink } from "../src/lib/round-trip";

const tripForm = {
  serviceType: "city" as const,
  flightNumber: "",
  terminal: "",
  passengers: "2",
  luggage: "1",
  duration: "",
  pickupLocation: "100 Main Street, Houston",
  dropoffLocation: "Houston Intercontinental Airport",
  date: new Date( "2099-06-11T00:00:00" ),
  time: "13:00",
  roundTrip: false,
  returnDate: new Date( "2099-06-11T00:00:00" ),
  returnTime: "",
  returnFlightNumber: "",
};

test( "round trip form requires a return time", () => {
  const result = UnifiedBookingSchema.safeParse( { ...tripForm, roundTrip: true, returnDate: new Date( "2099-06-12T00:00:00" ), returnTime: "" } );
  assert.equal( result.success, false );
  assert.deepEqual( result.error?.issues.map( issue => issue.path.join( "." ) ), [ "returnTime" ] );
} );

test( "round trip form rejects a return before the outbound pickup", () => {
  const result = UnifiedBookingSchema.safeParse( { ...tripForm, roundTrip: true, returnDate: new Date( "2099-06-11T00:00:00" ), returnTime: "12:30" } );
  assert.equal( result.success, false );
} );

test( "round trip form accepts a later return", () => {
  const result = UnifiedBookingSchema.safeParse( { ...tripForm, roundTrip: true, returnDate: new Date( "2099-06-11T00:00:00" ), returnTime: "18:00" } );
  assert.equal( result.success, true );
} );

test( "hourly bookings ignore round trip fields in the form", () => {
  const result = UnifiedBookingSchema.safeParse( { ...tripForm, serviceType: "hourly", duration: "3", roundTrip: true, returnTime: "" } );
  assert.equal( result.success, true );
} );

test( "booking API rejects a round trip on an hourly charter", () => {
  const result = BookingRequestSchema.safeParse( {
    date: "2099-06-11",
    time: "13:00",
    attendee: { name: "Rider", email: "rider@example.com" },
    tripType: "hourly",
    tripDetails: { pickupLocation: "100 Main Street, Houston", hours: 3 },
    roundTrip: { date: "2099-06-11", time: "18:00" },
  } );
  assert.equal( result.success, false );
} );

test( "booking API accepts a round trip for airport rides", () => {
  const result = BookingRequestSchema.safeParse( {
    date: "2099-06-11",
    time: "13:00",
    attendee: { name: "Rider", email: "rider@example.com" },
    tripType: "airport",
    tripDetails: { pickupLocation: "100 Main Street, Houston", dropoffLocation: "Houston Intercontinental Airport" },
    roundTrip: { date: "2099-06-14", time: "18:00", flightNumber: "UA1477" },
  } );
  assert.equal( result.success, true );
} );

test( "round trip links are read from stored trip details", () => {
  assert.deepEqual( roundTripLink( JSON.stringify( { roundTrip: { leg: "return", pairedReference: "GR-ABCD1234" } } ) ), { leg: "return", pairedReference: "GR-ABCD1234" } );
  assert.equal( roundTripLink( "{}" ), null );
  assert.equal( roundTripLink( "not json" ), null );
} );
