import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiscountCode,
  getDb,
  getDiscountCodeByCode,
  getDiscountCodesWithUsage,
  saveBooking,
  DiscountCodeError,
} from "../src/lib/db";

function uniqueCode( prefix: string ): string {
  return `${ prefix }-${ Date.now().toString( 36 ).toUpperCase() }`;
}

test( "discount codes reduce the stored booking total and increment redemptions", async () => {
  const code = uniqueCode( "SAVE" );
  await createDiscountCode( {
    code,
    label: "Test promo",
    kind: "percent",
    value: 10,
    active: true,
    maxRedemptions: 5,
  } );

  const booking = await saveBooking( {
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
  assert.equal( ( await getDiscountCodeByCode( code ) )?.redemptions, 1 );

  const tracked = ( await getDiscountCodesWithUsage() ).find( discount => discount.code === code );
  assert.equal( tracked?.trackedRedemptions, 1 );
  assert.equal( tracked?.totalDiscountCents, 1000 );
  assert.equal( tracked?.totalRevenueCents, 9000 );
  assert.equal( tracked?.usages[ 0 ]?.bookingReference, booking.reference );

  const outbox = await ( await getDb() ).prepare( `
    SELECT entity, legacyKey, action
    FROM pocketbase_core_outbox
    WHERE (entity = 'bookings' AND legacyKey = ?)
       OR (entity = 'discount_codes' AND legacyKey = ?)
    ORDER BY entity
  ` ).all( booking.reference, String( tracked?.id ) ) as Array<{ entity: string; legacyKey: string; action: string }>;
  assert.deepEqual( outbox.map( row => ( { entity: row.entity, action: row.action } ) ), [
    { entity: "bookings", action: "upsert" },
    { entity: "discount_codes", action: "upsert" },
  ] );
} );

test( "discount codes reject unknown codes", async () => {
  await assert.rejects(
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
