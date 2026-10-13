import assert from "node:assert/strict";
import test from "node:test";
import { getPrimaryFlightProvider } from "../src/lib/flights/providers";
import { normalizeFlightLookupKey } from "../src/lib/flights/types";

async function withAeroDataBox( respond: ( url: URL, init?: RequestInit ) => Response, run: () => Promise<void> ) {
  const previous = {
    primary: process.env.FLIGHT_PRIMARY_PROVIDER,
    key: process.env.AERODATABOX_RAPIDAPI_KEY,
    fetch: globalThis.fetch,
  };
  delete process.env.FLIGHT_PRIMARY_PROVIDER;
  process.env.AERODATABOX_RAPIDAPI_KEY = "rapid-key";
  globalThis.fetch = ( async ( input: string | URL | Request, init?: RequestInit ) => respond( new URL( String( input ) ), init ) ) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previous.fetch;
    if ( previous.primary === undefined ) delete process.env.FLIGHT_PRIMARY_PROVIDER;
    else process.env.FLIGHT_PRIMARY_PROVIDER = previous.primary;
    if ( previous.key === undefined ) delete process.env.AERODATABOX_RAPIDAPI_KEY;
    else process.env.AERODATABOX_RAPIDAPI_KEY = previous.key;
  }
}

const json = ( body: unknown, status = 200 ) => new Response( JSON.stringify( body ), { status, headers: { "Content-Type": "application/json" } } );

test( "AeroDataBox is preferred when its RapidAPI key is configured", async () => {
  await withAeroDataBox( () => json( [] ), async () => {
    assert.equal( getPrimaryFlightProvider()?.id, "aerodatabox" );
  } );
} );

test( "AeroDataBox looks up a future flight by number and arrival date", async () => {
  let requested: URL | undefined;
  let headers: Headers | undefined;
  await withAeroDataBox( ( url, init ) => {
    requested = url;
    headers = new Headers( init?.headers );
    return json( [
      {
        number: "UA 1476",
        status: "Expected",
        codeshareStatus: "IsCodeshared",
        isCargo: false,
        airline: { name: "Air Canada" },
        departure: { airport: { iata: "ORD", name: "Chicago O'Hare" }, scheduledTime: { utc: "2026-11-20 18:00Z", local: "2026-11-20 12:00-06:00" } },
        arrival: { airport: { iata: "IAH", name: "Houston George Bush Intercontinental" }, scheduledTime: { utc: "2026-11-20 21:00Z", local: "2026-11-20 15:00-06:00" } },
      },
      {
        number: "UA 1476",
        status: "Expected",
        codeshareStatus: "IsOperator",
        isCargo: false,
        airline: { name: "United Airlines" },
        departure: { airport: { iata: "ORD", name: "Chicago O'Hare" }, scheduledTime: { utc: "2026-11-20 18:00Z", local: "2026-11-20 12:00-06:00" }, terminal: "1" },
        arrival: { airport: { iata: "IAH", name: "Houston George Bush Intercontinental" }, scheduledTime: { utc: "2026-11-20 21:00Z", local: "2026-11-20 15:00-06:00" }, revisedTime: { utc: "2026-11-20 21:20Z", local: "2026-11-20 15:20-06:00" }, terminal: "C", gate: "C12" },
      },
    ] );
  }, async () => {
    const flight = await getPrimaryFlightProvider()!.lookup( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-11-20", direction: "from_airport" } )! );
    assert.equal( requested?.host, "aerodatabox.p.rapidapi.com" );
    assert.equal( requested?.pathname, "/flights/number/UA1476/2026-11-20" );
    assert.equal( requested?.searchParams.get( "dateLocalRole" ), "Arrival" );
    assert.equal( headers?.get( "x-rapidapi-key" ), "rapid-key" );
    assert.equal( headers?.get( "x-rapidapi-host" ), "aerodatabox.p.rapidapi.com" );
    assert.equal( flight?.provider, "aerodatabox" );
    assert.equal( flight?.airline, "United Airlines" );
    assert.equal( flight?.flightIata, "UA1476" );
    assert.equal( flight?.flightDate, "2026-11-20" );
    assert.equal( flight?.status, "scheduled" );
    assert.equal( flight?.scheduled.arrival, "2026-11-20T21:00Z" );
    assert.equal( flight?.estimated.arrival, "2026-11-20T21:20Z" );
    assert.equal( flight?.terminal.arrival, "C" );
    assert.equal( flight?.gate.arrival, "C12" );
    assert.equal( flight?.destination.iata, "IAH" );
  } );
} );

test( "AeroDataBox prefers the leg that touches Houston", async () => {
  await withAeroDataBox( () => json( [
    { number: "WN 100", status: "Expected", codeshareStatus: "IsOperator", isCargo: false, departure: { airport: { iata: "DAL" } }, arrival: { airport: { iata: "AUS" } } },
    { number: "WN 100", status: "Expected", codeshareStatus: "IsOperator", isCargo: false, departure: { airport: { iata: "AUS" } }, arrival: { airport: { iata: "HOU" } } },
  ] ), async () => {
    const flight = await getPrimaryFlightProvider()!.lookup( normalizeFlightLookupKey( { flightIata: "WN100", flightDate: "2026-11-20" } )! );
    assert.equal( flight?.destination.iata, "HOU" );
    assert.equal( flight?.direction, "from_airport" );
  } );
} );

test( "AeroDataBox treats No Content as a flight that does not operate that day", async () => {
  await withAeroDataBox( () => new Response( null, { status: 204 } ), async () => {
    const flight = await getPrimaryFlightProvider()!.lookup( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-11-21" } )! );
    assert.equal( flight, null );
  } );
} );

test( "AeroDataBox surfaces RapidAPI errors", async () => {
  await withAeroDataBox( () => json( { message: "You have exceeded the MONTHLY quota" }, 429 ), async () => {
    await assert.rejects(
      getPrimaryFlightProvider()!.lookup( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-11-21" } )! ),
      /MONTHLY quota/,
    );
  } );
} );

test( "AeroDataBox does not report a misconfigured host as a missing flight", async () => {
  await withAeroDataBox( () => new Response( "<!DOCTYPE html>", { status: 404, headers: { "Content-Type": "text/html" } } ), async () => {
    await assert.rejects(
      getPrimaryFlightProvider()!.lookup( normalizeFlightLookupKey( { flightIata: "UA1476", flightDate: "2026-11-21" } )! ),
      /AeroDataBox returned 404/,
    );
  } );
} );
