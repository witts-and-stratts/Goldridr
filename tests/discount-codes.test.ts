import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiscountCode,
  getDiscountCodeByCode,
  getDiscountCodesWithUsage,
  saveBooking,
  DiscountCodeError,
} from "../src/lib/db";

function uniqueCode( prefix: string ): string {
  return `${ prefix }-${ Date.now().toString( 36 ).toUpperCase() }`;
}

test( "discount codes reduce the stored booking total and increment redemptions", () => {
  const code = uniqueCode( "SAVE" );
  createDiscountCode( {
    code,
    label: "Test promo",
    kind: "percent",
    value: 10,
    active: true,
    maxRedemptions: 5,
  } );

  const booking = saveBooking( {
    reference: uniqueCode( "GR" ),
    tripType: "city",
    date: "2026-12-31",
    time: "13:00",
    duration: 60,
    name: "Discount Rider",
    email: "discount@example.com",
    phone: "+17135550123",
    notes: "",
    status: "pending",
    tripDetails: JSON.stringify( {
      pickupLocation: "Houston, Texas",
      dropoffLocation: "Austin, Texas",
      estimatedPrice: 100,
      estimatedTotal: 100,
    } ),
    chauffeurId: null,
    smsConsentVersion: null,
    smsConsentedAt: null,
    discountCode: code,
  } );

  const tripDetails = JSON.parse( booking.tripDetails ) as Record<string, unknown>;
  assert.equal( tripDetails.discountCode, code );
  assert.equal( tripDetails.discountAmountCents, 1000 );
  assert.equal( tripDetails.originalEstimatedTotal, 100 );
  assert.equal( tripDetails.estimatedTotal, 90 );
  assert.equal( getDiscountCodeByCode( code )?.redemptions, 1 );

  const tracked = getDiscountCodesWithUsage().find( discount => discount.code === code );
  assert.equal( tracked?.trackedRedemptions, 1 );
  assert.equal( tracked?.totalDiscountCents, 1000 );
  assert.equal( tracked?.totalRevenueCents, 9000 );
  assert.equal( tracked?.usages[ 0 ]?.bookingReference, booking.reference );
} );

test( "discount codes reject unknown codes", () => {
  assert.throws(
    () => saveBooking( {
      reference: uniqueCode( "GR" ),
      tripType: "city",
      date: "2026-12-31",
      time: "14:00",
      duration: 60,
      name: "Invalid Code Rider",
      email: "invalid@example.com",
      phone: "+17135550123",
      notes: "",
      status: "pending",
      tripDetails: JSON.stringify( {
        pickupLocation: "Houston, Texas",
        dropoffLocation: "Austin, Texas",
        estimatedPrice: 100,
        estimatedTotal: 100,
      } ),
      chauffeurId: null,
      smsConsentVersion: null,
      smsConsentedAt: null,
      discountCode: "DOES-NOT-EXIST",
    } ),
    DiscountCodeError
  );
} );
