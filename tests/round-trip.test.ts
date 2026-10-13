import assert from "node:assert/strict";
import test from "node:test";
import { BookingRequestSchema } from "../src/lib/booking-create";
import { UnifiedBookingSchema } from "../src/lib/form-schemas";
import { bookingCharges, legChargeCents, parseRideReference, rideReference, rideViews } from "../src/lib/booking-legs";
import type { BookingRecord } from "../src/lib/pocketbase/repository";

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

const roundTripBooking: BookingRecord = {
  id: 1,
  reference: "GR-ABCD1234",
  tripType: "airport",
  date: "2099-06-11",
  time: "13:00",
  duration: 45,
  name: "Rider",
  email: "rider@example.com",
  phone: "",
  notes: "",
  status: "confirmed",
  tripDetails: JSON.stringify( { pickupLocation: "Home", dropoffLocation: "IAH", roundTrip: { leg: "outbound", outboundCents: 10000, returnCents: 8000, discountPercent: 10, discountCents: 1800 } } ),
  chauffeurId: "c1",
  quoteSubtotalCents: 16200,
  quoteDiscountCents: 0,
  quoteTotalCents: 16200,
  createdAt: "2099-01-01T00:00:00.000Z",
  returnLeg: { date: "2099-06-14", time: "18:00", duration: 50, chauffeurId: "c2", tripDetails: JSON.stringify( { pickupLocation: "IAH", dropoffLocation: "Home" } ), status: null, pinConfirmedAt: null },
};

test( "ride references address each leg of one booking", () => {
  assert.equal( rideReference( "GR-ABCD1234", "return" ), "GR-ABCD1234-R" );
  assert.deepEqual( parseRideReference( "gr-abcd1234-r" ), { bookingReference: "GR-ABCD1234", leg: "return" } );
  assert.deepEqual( parseRideReference( "GR-ABCD1234" ), { bookingReference: "GR-ABCD1234", leg: "outbound" } );
} );

test( "a round trip expands into one ride per leg", () => {
  const [ outbound, ret ] = rideViews( roundTripBooking );
  assert.equal( outbound.reference, "GR-ABCD1234" );
  assert.equal( ret.reference, "GR-ABCD1234-R" );
  assert.equal( ret.bookingReference, "GR-ABCD1234" );
  assert.equal( ret.date, "2099-06-14" );
  assert.equal( ret.chauffeurId, "c2" );
  assert.equal( JSON.parse( ret.tripDetails ).roundTrip.pairedReference, "GR-ABCD1234" );
  assert.equal( rideViews( { ...roundTripBooking, returnLeg: null } ).length, 1 );
} );

test( "a leg status overrides the booking status for that ride only", () => {
  const [ outbound, ret ] = rideViews( { ...roundTripBooking, returnLeg: { ...roundTripBooking.returnLeg!, status: "cancelled" } } );
  assert.equal( outbound.status, "confirmed" );
  assert.equal( ret.status, "cancelled" );
} );

test( "charges split the discounted total across legs in proportion to their prices", () => {
  const charges = bookingCharges( roundTripBooking );
  assert.deepEqual( charges.legs.map( leg => leg.chargedCents ), [ 9000, 7200 ] );
  assert.equal( charges.roundTripDiscountCents, 1800 );
  assert.equal( charges.adjustmentCents, 0 );
  assert.equal( legChargeCents( roundTripBooking, [ "return" ] ), 7200 );
  assert.equal( legChargeCents( roundTripBooking, [ "outbound", "return" ] ), 16200 );
} );

test( "a discount code is shared across both legs", () => {
  const charges = bookingCharges( { ...roundTripBooking, quoteDiscountCents: 1620, quoteTotalCents: 14580 } );
  assert.equal( charges.legs[ 0 ].chargedCents + charges.legs[ 1 ].chargedCents, 14580 );
  assert.equal( charges.codeDiscountCents, 1620 );
  assert.equal( charges.adjustmentCents, 0 );
} );
