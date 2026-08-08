import assert from "node:assert/strict";
import test from "node:test";
import { getFlightAlertChanges, getNextFlightCheck, FLIGHT_FIVE_MINUTES, FLIGHT_FIFTEEN_MINUTES, FLIGHT_SIX_HOURS } from "../src/lib/flights/policy";
import { flightLookupId, normalizeFlightLookupKey, type FlightSnapshot } from "../src/lib/flights/types";
import { definePermissionedScrapeProvider, getManualFlightProvider, getPrimaryFlightProvider } from "../src/lib/flights/providers";

function snapshot( overrides: Partial<FlightSnapshot> = {} ): FlightSnapshot {
  return {
    provider: "fixture",
    flightIata: "UA1476",
    flightDate: "2026-08-09",
    direction: "from_airport",
    status: "scheduled",
    airline: "United",
    origin: { iata: "ORD", name: "Chicago O'Hare" },
    destination: { iata: "IAH", name: "Houston Intercontinental" },
    scheduled: { departure: "2026-08-09T12:00:00Z", arrival: "2026-08-09T15:00:00Z" },
    estimated: { departure: null, arrival: null },
    actual: { departure: null, arrival: null },
    terminal: { departure: "1", arrival: "C" },
    gate: { departure: "B4", arrival: "C12" },
    observedAt: "2026-08-09T09:00:00Z",
    ...overrides,
  };
}

test( "flight lookup keys normalize number and distinguish date and direction", () => {
  const pickup = normalizeFlightLookupKey( { flight_iata: "ua 1476", flight_date: "2026-08-09", direction: "from_airport" } );
  const dropoff = normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-08-09", direction: "to_airport" } );
  assert.deepEqual( pickup, { flightIata: "UA1476", flightDate: "2026-08-09", direction: "from_airport" } );
  assert.notEqual( flightLookupId( pickup! ), flightLookupId( dropoff! ) );
  assert.equal( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "not-a-date", direction: "from_airport" } ), null );
} );

test( "no automatic or paid provider is enabled by default", () => {
  const previousEnabled = process.env.FLIGHT_AVIATIONSTACK_ENABLED;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  delete process.env.FLIGHT_AVIATIONSTACK_ENABLED;
  delete process.env.AVIATIONSTACK_API_KEY;
  try {
    assert.equal( getPrimaryFlightProvider(), null );
    assert.equal( getManualFlightProvider(), null );
  } finally {
    if ( previousEnabled === undefined ) delete process.env.FLIGHT_AVIATIONSTACK_ENABLED;
    else process.env.FLIGHT_AVIATIONSTACK_ENABLED = previousEnabled;
    if ( previousKey === undefined ) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = previousKey;
  }
} );

test( "scrape providers require documented permission and a respectful interval", () => {
  assert.throws( () => definePermissionedScrapeProvider( {
    id: "unapproved-fixture",
    permission: { dataOwner: "", grantedAt: "", reference: "", minimumIntervalMs: 0 },
    async lookup() { return null; },
  } ), /missing documented commercial permission/ );
} );

test( "tracking waits until six hours out then uses fifteen and five minute intervals", () => {
  const target = Date.parse( "2026-08-09T15:00:00Z" );
  const early = Date.parse( "2026-08-09T01:00:00Z" );
  assert.equal( Date.parse( getNextFlightCheck( target, null, early ).at ), target - FLIGHT_SIX_HOURS );
  const mid = Date.parse( "2026-08-09T10:00:00Z" );
  assert.equal( Date.parse( getNextFlightCheck( target, null, mid ).at ), mid + FLIGHT_FIFTEEN_MINUTES );
  const near = Date.parse( "2026-08-09T14:00:00Z" );
  assert.equal( Date.parse( getNextFlightCheck( target, null, near ).at ), near + FLIGHT_FIVE_MINUTES );
  assert.equal( getNextFlightCheck( target, snapshot( { status: "landed" } ), near ).active, false );
} );

test( "alerts require operationally material changes", () => {
  const before = snapshot();
  assert.deepEqual( getFlightAlertChanges( before, snapshot() ), [] );
  assert.deepEqual( getFlightAlertChanges( before, snapshot( { estimated: { departure: null, arrival: "2026-08-09T15:10:00Z" } } ) ), [] );
  const changes = getFlightAlertChanges( before, snapshot( {
    status: "diverted",
    terminal: { departure: "1", arrival: "D" },
    gate: { departure: "B4", arrival: "D2" },
    estimated: { departure: null, arrival: "2026-08-09T15:20:00Z" },
  } ) );
  assert.equal( changes.length, 4 );
} );
