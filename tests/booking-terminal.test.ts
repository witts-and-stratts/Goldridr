import assert from "node:assert/strict";
import test from "node:test";
import { BookingRequestSchema } from "../src/app/api/booking/route";
import { bookingRecordToResponses } from "../src/lib/booking-data";
import { UnifiedBookingSchema } from "../src/lib/form-schemas";

test( "airport form accepts an empty flight number and terminal" , () => {
  const result = UnifiedBookingSchema.safeParse( {
    serviceType: "airport",
    flightNumber: "",
    terminal: "",
    passengers: "1",
    luggage: "1",
    duration: "",
    pickupLocation: "Houston Intercontinental Airport",
    dropoffLocation: "100 Main Street, Houston",
    date: new Date( "2099-06-11T00:00:00" ),
    time: "13:01",
  } );

  assert.equal( result.success, true );
} );

test( "airport booking API schema accepts a missing flight number and terminal" , () => {
  const result = BookingRequestSchema.safeParse( {
    date: "2099-06-11",
    time: "13:01",
    attendee: { name: "Airport Rider", email: "airport@example.com" },
    tripType: "airport",
    tripDetails: {
      pickupLocation: "Houston Intercontinental Airport",
      dropoffLocation: "100 Main Street, Houston",
    },
  } );

  assert.equal( result.success, true );
} );

test( "booking API requires a text message preference with a phone number", () => {
  const booking = {
    date: "2099-06-11",
    time: "13:01",
    attendee: {
      name: "Airport Rider",
      email: "airport@example.com",
      phone: "+17135550123",
    },
  };

  assert.equal( BookingRequestSchema.safeParse( booking ).success, false );
  assert.equal(
    BookingRequestSchema.safeParse( { ...booking, smsOptIn: true } ).success,
    true,
  );
  assert.equal(
    BookingRequestSchema.safeParse( {
      ...booking,
      marketingSmsOptIn: true,
    } ).success,
    true,
  );
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
