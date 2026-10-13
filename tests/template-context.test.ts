import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTemplateContext,
  buildVariableLookup,
  extractVariables,
  formatBookingDate,
  formatBookingTime,
  formatCurrency,
  renderTemplate,
  renderHtmlTemplate,
  tripTypeLabel,
} from "@/lib/notifications/template-context";
import { smsMetrics, validateRenderedSmsBody, validateTemplateContent } from "@/lib/notifications/template-validation";
import { SMS_BODY_OPT_OUT } from "@/lib/sms-consent-copy";

const PAYLOAD: Record<string, unknown> = {
  bookingReference: "GR-7F3K2",
  passengerName: "Amara Okafor",
  passengerEmail: "amara@example.com",
  passengerPhone: "+17135550123",
  date: "2026-06-14",
  time: "09:30",
  tripType: "airport",
  status: "confirmed",
  paymentUrl: "https://app.goldridr.com/pay/sample-token",
  chauffeurName: "Marcus Bell",
  pin: "4821",
  tripDetails: {
    pickupLocation: "The Ritz-Carlton",
    dropoffLocation: "MSY",
    terminal: "North Terminal",
    passengers: "2",
    estimatedTotal: 185,
  },
};

test( "formatters match the email and invoice conventions", () => {
  assert.equal( formatBookingDate( "2026-06-14" ), "Sun, Jun 14, 2026" );
  assert.equal( formatBookingTime( "09:30" ), "9:30 AM" );
  assert.equal( formatBookingTime( "14:05" ), "2:05 PM" );
  assert.equal( formatCurrency( 185 ), "$185.00" );
  assert.equal( formatCurrency( "nope" ), "" );
  assert.equal( tripTypeLabel( "airport" ), "Airport transfer" );
  assert.equal( tripTypeLabel( "hourly" ), "Hourly service" );
  assert.equal( tripTypeLabel( "city" ), "Around town" );
  assert.equal( tripTypeLabel( "" ), "Chauffeur service" );
} );

test( "buildTemplateContext exposes canonical nested and legacy variables", () => {
  const context = buildTemplateContext( PAYLOAD, { appUrl: "https://app.goldridr.com" } );
  assert.equal( context.booking.reference, "GR-7F3K2" );
  assert.equal( context.booking.statusLabel, "Confirmed" );
  assert.equal( context.rider.name, "Amara Okafor" );
  assert.equal( context.trip.date, "Sun, Jun 14, 2026" );
  assert.equal( context.trip.time, "9:30 AM" );
  assert.equal( context.trip.serviceLabel, "Airport transfer" );
  assert.equal( context.trip.estimatedTotal, "$185.00" );
  assert.equal( context.chauffeur.name, "Marcus Bell" );
  assert.equal( context.links.payment, PAYLOAD.paymentUrl );
  assert.equal( context.company.appUrl, "https://app.goldridr.com" );

  const lookup = buildVariableLookup( context );
  assert.equal( lookup[ "booking.reference" ], "GR-7F3K2" );
  assert.equal( lookup.bookingReference, "GR-7F3K2" );
  assert.equal( lookup[ "tripDetails.terminal" ], "North Terminal" );
} );

test( "renderTemplate resolves nested paths, whitespace, and legacy aliases", () => {
  const context = buildTemplateContext( PAYLOAD, { appUrl: "https://app.goldridr.com" } );
  assert.equal(
    renderTemplate( "Hi {{rider.name}}, ref {{ booking.reference }}", context ),
    "Hi Amara Okafor, ref GR-7F3K2"
  );
  assert.equal( renderTemplate( "{{passengerName}}", context ), "Amara Okafor" );
} );

test( "renderTemplate substitutes unknown variables with an empty string", () => {
  const context = buildTemplateContext( PAYLOAD );
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal( renderTemplate( "A{{ missing.value }}B", context ), "AB" );
  } finally {
    console.warn = originalWarn;
  }
} );

test( "email content buckets reject HTML and preserve text-only overrides", () => {
  const context = buildTemplateContext( { ...PAYLOAD, passengerName: '<img src=x onerror="alert(1)">' } );
  assert.equal( renderHtmlTemplate( "<p>{{ rider.name }}</p>", context ), "<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>" );

  const safe = validateTemplateContent( "email", "booking_created", {
    subject: "Ride update",
    message: "Hello {{ rider.name }}",
  } );
  assert.equal( safe.ok, true );

  const html = validateTemplateContent( "email", "booking_created", {
    subject: "Ride update",
    html: "<p onclick=\"alert(1)\">Hello</p><script>alert(1)</script>",
  } );
  assert.equal( html.ok, false );
} );

test( "extractVariables deduplicates and ignores malformed tokens", () => {
  assert.deepEqual(
    extractVariables( "{{ booking.reference }} {{booking.reference}} {{ rider.name }} {{not valid!}}" ).sort(),
    [ "booking.reference", "rider.name" ]
  );
  assert.deepEqual( extractVariables( "no variables here" ), [] );
} );

test( "SMS validation uses final GSM-7 or UCS-2 segment counts and reserves compliance copy", () => {
  assert.equal( smsMetrics( "A".repeat( 161 ) ).segments, 2 );
  assert.equal( smsMetrics( "😀".repeat( 71 ) ).encoding, "ucs2" );
  assert.equal( smsMetrics( "😀".repeat( 71 ) ).segments, 2 );
  assert.deepEqual( validateRenderedSmsBody( "booking_reminder", `Hello ${ SMS_BODY_OPT_OUT }` ), [ "Compliance copy is server-managed and must not appear in the editable message" ] );
  assert.equal( validateRenderedSmsBody( "booking_reminder", "A".repeat( 500 ) ).length, 1 );
} );
