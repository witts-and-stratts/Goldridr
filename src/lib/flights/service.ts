import { getManualFlightProvider, getPrimaryFlightProvider, type FlightDataProvider } from "./providers";
import { countRecentProviderRequests, readCachedFlight, recordFlightMetric, writeFlightSnapshot } from "./store";
import { flightLookupId, type FlightLookupKey, type FlightSnapshot } from "./types";

const inFlight = new Map<string, Promise<FlightSnapshot | null>>();

export class FlightProviderBudgetError extends Error {
  constructor() {
    super( "The hourly manual flight lookup budget has been reached" );
    this.name = "FlightProviderBudgetError";
  }
}

async function assertManualBudget( provider: string ): Promise<void> {
  const configured = Number( process.env.FLIGHT_MANUAL_MAX_PER_HOUR );
  const limit = Number.isSafeInteger( configured ) && configured > 0 ? configured : 20;
  const used = await countRecentProviderRequests( provider, new Date( Date.now() - 60 * 60_000 ).toISOString() );
  if ( used >= limit ) throw new FlightProviderBudgetError();
}

async function callProvider( provider: FlightDataProvider, key: FlightLookupKey ): Promise<FlightSnapshot | null> {
  const coalesceKey = `${ provider.id }:${ flightLookupId( key ) }`;
  const existing = inFlight.get( coalesceKey );
  if ( existing ) return existing;
  const request = ( async () => {
    const startedAt = Date.now();
    await recordFlightMetric( { eventType: "provider_request", key, provider: provider.id, success: true } );
    try {
      const snapshot = await provider.lookup( key );
      await recordFlightMetric( { eventType: "provider_success", key, provider: provider.id, success: Boolean( snapshot ), durationMs: Date.now() - startedAt } );
      if ( snapshot ) await writeFlightSnapshot( key, snapshot );
      return snapshot;
    } catch ( error ) {
      await recordFlightMetric( { eventType: "provider_failure", key, provider: provider.id, success: false, durationMs: Date.now() - startedAt, metadata: { message: error instanceof Error ? error.message : String( error ) } } );
      throw error;
    } finally {
      inFlight.delete( coalesceKey );
    }
  } )();
  inFlight.set( coalesceKey, request );
  return request;
}

export async function lookupFlight( key: FlightLookupKey, options: { allowManualProvider?: boolean } = {} ): Promise<{ flight: FlightSnapshot | null; cached: boolean; providerAvailable: boolean }> {
  const cached = await readCachedFlight( key );
  if ( cached ) {
    await recordFlightMetric( { eventType: "cache_hit", key, provider: cached.provider, success: true } );
    return { flight: cached, cached: true, providerAvailable: true };
  }
  await recordFlightMetric( { eventType: "cache_miss", key, success: false } );
  const primary = getPrimaryFlightProvider();
  if ( primary ) {
    const flight = await callProvider( primary, key );
    if ( flight ) return { flight, cached: false, providerAvailable: true };
  }
  if ( options.allowManualProvider ) {
    const manual = getManualFlightProvider();
    if ( manual ) {
      await assertManualBudget( manual.id );
      return { flight: await callProvider( manual, key ), cached: false, providerAvailable: true };
    }
  }
  return { flight: null, cached: false, providerAvailable: Boolean( primary || ( options.allowManualProvider && getManualFlightProvider() ) ) };
}
