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
  const numberOnly = normalizeFlightLookupKey( { flightIata: "ua 1476" } );
  const pickup = normalizeFlightLookupKey( { flight_iata: "ua 1476", flight_date: "2026-08-09", direction: "from_airport" } );
  const dropoff = normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-08-09", direction: "to_airport" } );
  assert.deepEqual( numberOnly, { flightIata: "UA1476", flightDate: null, direction: null } );
  assert.deepEqual( pickup, { flightIata: "UA1476", flightDate: "2026-08-09", direction: "from_airport" } );
  assert.notEqual( flightLookupId( pickup! ), flightLookupId( dropoff! ) );
  assert.equal( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "not-a-date", direction: "from_airport" } ), null );
} );

test( "Aviationstack can look up a flight number without date or direction", async () => {
  const previousPrimary = process.env.FLIGHT_PRIMARY_PROVIDER;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  process.env.FLIGHT_PRIMARY_PROVIDER = "aviationstack";
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  globalThis.fetch = ( async input => {
    requestedUrl = String( input );
    return new Response( JSON.stringify( {
      data: [ {
        flight_date: "2026-08-09",
        flight_status: "scheduled",
        airline: { name: "United" },
        flight: { iata: "UA1476" },
        departure: { iata: "ORD", scheduled: "2026-08-09T12:00:00Z" },
        arrival: { iata: "IAH", scheduled: "2026-08-09T15:00:00Z" },
      } ],
    } ), { status: 200, headers: { "Content-Type": "application/json" } } );
  } ) as typeof fetch;
  try {
    const provider = getPrimaryFlightProvider();
    const flight = await provider?.lookup( normalizeFlightLookupKey( { flightIata: "UA1476" } )! );
    const url = new URL( requestedUrl );
    assert.equal( url.searchParams.get( "flight_iata" ), "UA1476" );
    assert.equal( url.searchParams.has( "flight_date" ), false );
    assert.equal( flight?.flightDate, "2026-08-09" );
  } finally {
    globalThis.fetch = previousFetch;
    if ( previousPrimary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previousPrimary;
    if ( previousKey === undefined ) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = previousKey;
  }
} );

test( "Aviationstack retries a restricted date filter and keeps the requested date", async () => {
  const previousPrimary = process.env.FLIGHT_PRIMARY_PROVIDER;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  const previousFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  process.env.FLIGHT_PRIMARY_PROVIDER = "aviationstack";
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  globalThis.fetch = ( async input => {
    requestedUrls.push( String( input ) );
    if ( requestedUrls.length === 1 ) {
      return new Response( JSON.stringify( {
        error: { code: "function_access_restricted", message: "The flight_date filter is unavailable" },
      } ), { status: 403, headers: { "Content-Type": "application/json" } } );
    }
    return new Response( JSON.stringify( {
      data: [ {
        flight_date: "2026-08-08",
        flight: { iata: "UA1476" },
        departure: { iata: "ORD", scheduled: "2026-08-08T12:00:00Z" },
        arrival: { iata: "IAH", scheduled: "2026-08-08T15:00:00Z" },
      }, {
        flight_date: "2026-08-09",
        flight: { iata: "UA1476" },
        departure: { iata: "ORD", scheduled: "2026-08-09T12:00:00Z" },
        arrival: { iata: "IAH", scheduled: "2026-08-09T15:00:00Z" },
      } ],
    } ), { status: 200, headers: { "Content-Type": "application/json" } } );
  } ) as typeof fetch;
  try {
    const provider = getPrimaryFlightProvider();
    const flight = await provider?.lookup( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-08-09" } )! );
    assert.equal( requestedUrls.length, 2 );
    assert.equal( new URL( requestedUrls[ 0 ] ).searchParams.get( "flight_date" ), "2026-08-09" );
    assert.equal( new URL( requestedUrls[ 1 ] ).searchParams.has( "flight_date" ), false );
    assert.equal( flight?.flightDate, "2026-08-09" );
  } finally {
    globalThis.fetch = previousFetch;
    if ( previousPrimary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previousPrimary;
    if ( previousKey === undefined ) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = previousKey;
  }
} );

test( "Aviationstack uses the arrival date for airport pickups", async () => {
  const previousPrimary = process.env.FLIGHT_PRIMARY_PROVIDER;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  process.env.FLIGHT_PRIMARY_PROVIDER = "aviationstack";
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  globalThis.fetch = ( async input => {
    requestedUrl = String( input );
    return new Response( JSON.stringify( {
      data: [ {
        flight_date: "2026-08-08",
        flight: { iata: "UA1476" },
        departure: { iata: "ORD", scheduled: "2026-08-08T22:00:00-05:00" },
        arrival: { iata: "IAH", scheduled: "2026-08-09T00:35:00-05:00" },
      } ],
    } ), { status: 200, headers: { "Content-Type": "application/json" } } );
  } ) as typeof fetch;
  try {
    const provider = getPrimaryFlightProvider();
    const flight = await provider?.lookup( normalizeFlightLookupKey( {
      flightIata: "UA1476",
      flightDate: "2026-08-09",
      direction: "from_airport",
    } )! );
    const url = new URL( requestedUrl );
    assert.equal( url.searchParams.get( "arr_scheduled_time_arr" ), "2026-08-09" );
    assert.equal( url.searchParams.has( "flight_date" ), false );
    assert.equal( flight?.scheduled.arrival, "2026-08-09T00:35:00-05:00" );
  } finally {
    globalThis.fetch = previousFetch;
    if ( previousPrimary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previousPrimary;
    if ( previousKey === undefined ) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = previousKey;
  }
} );

test( "Aviationstack does not substitute a different date", async () => {
  const previousPrimary = process.env.FLIGHT_PRIMARY_PROVIDER;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.FLIGHT_PRIMARY_PROVIDER = "aviationstack";
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  globalThis.fetch = ( async () => new Response( JSON.stringify( {
    data: [ {
      flight_date: "2026-08-08",
      flight: { iata: "UA1476" },
      departure: { iata: "ORD", scheduled: "2026-08-08T12:00:00Z" },
      arrival: { iata: "IAH", scheduled: "2026-08-08T15:00:00Z" },
    } ],
  } ), { status: 200, headers: { "Content-Type": "application/json" } } ) ) as typeof fetch;
  try {
    const provider = getPrimaryFlightProvider();
    const flight = await provider?.lookup( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-08-09" } )! );
    assert.equal( flight, null );
  } finally {
    globalThis.fetch = previousFetch;
    if ( previousPrimary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previousPrimary;
    if ( previousKey === undefined ) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = previousKey;
  }
} );

test( "no automatic or paid provider is enabled by default", () => {
  const previousPrimary = process.env.FLIGHT_PRIMARY_PROVIDER;
  const previousEnabled = process.env.FLIGHT_AVIATIONSTACK_ENABLED;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  delete process.env.FLIGHT_PRIMARY_PROVIDER;
  delete process.env.FLIGHT_AVIATIONSTACK_ENABLED;
  delete process.env.AVIATIONSTACK_API_KEY;
  try {
    assert.equal( getPrimaryFlightProvider(), null );
    assert.equal( getManualFlightProvider(), null );
  } finally {
    if ( previousPrimary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previousPrimary;
    if ( previousEnabled === undefined ) delete process.env.FLIGHT_AVIATIONSTACK_ENABLED;
    else process.env.FLIGHT_AVIATIONSTACK_ENABLED = previousEnabled;
    if ( previousKey === undefined ) delete process.env.AVIATIONSTACK_API_KEY;
    else process.env.AVIATIONSTACK_API_KEY = previousKey;
  }
} );

test( "Aviationstack is the primary provider when its API key is configured", () => {
  const previousPrimary = process.env.FLIGHT_PRIMARY_PROVIDER;
  const previousKey = process.env.AVIATIONSTACK_API_KEY;
  delete process.env.FLIGHT_PRIMARY_PROVIDER;
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  try {
    assert.equal( getPrimaryFlightProvider()?.id, "aviationstack" );
    process.env.FLIGHT_PRIMARY_PROVIDER = "none";
    assert.equal( getPrimaryFlightProvider(), null );
  } finally {
    if ( previousPrimary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previousPrimary;
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
