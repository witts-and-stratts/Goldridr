import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first } from "@/lib/pocketbase/core";
import { flightLookupId, isTerminalFlightStatus, relevantFlightTime, type FlightLookupKey, type FlightSnapshot } from "./types";

export type FlightMetric = "cache_hit" | "cache_miss" | "provider_request" | "provider_success" | "provider_failure" | "parse_failure" | "alert";

function expiryFor( snapshot: FlightSnapshot ): string {
  if ( isTerminalFlightStatus( snapshot.status ) ) return new Date( Date.now() + 24 * 60 * 60_000 ).toISOString();
  const relevantAt = Date.parse( relevantFlightTime( snapshot ) || "" );
  const untilFlight = relevantAt - Date.now();
  const ttl = untilFlight <= 2 * 60 * 60_000 ? 5 * 60_000 : untilFlight <= 6 * 60 * 60_000 ? 15 * 60_000 : 60 * 60_000;
  return new Date( Date.now() + ttl ).toISOString();
}

export async function readCachedFlight( key: FlightLookupKey, allowStale = false ): Promise<FlightSnapshot | null> {
  const row = await first( pocketBaseCollections.flightSnapshots, "lookupKey = {:lookupKey}", { lookupKey: flightLookupId( key ) } );
  if ( !row || ( !allowStale && Date.parse( String( row.expiresAt ) ) <= Date.now() ) ) return null;
  const snapshot = row.snapshot;
  return snapshot && typeof snapshot === "object" ? snapshot as FlightSnapshot : null;
}

export async function findFlightSnapshotRecord( key: FlightLookupKey ): Promise<Record<string, unknown> | null> {
  return await first( pocketBaseCollections.flightSnapshots, "lookupKey = {:lookupKey}", { lookupKey: flightLookupId( key ) } ) || null;
}

export async function writeFlightSnapshot( key: FlightLookupKey, snapshot: FlightSnapshot ): Promise<Record<string, unknown>> {
  const pb = getPocketBaseClient();
  const lookupKey = flightLookupId( key );
  const data = {
    lookupKey,
    flightIata: key.flightIata,
    flightDate: snapshot.flightDate,
    direction: snapshot.direction,
    provider: snapshot.provider,
    status: snapshot.status,
    snapshot,
    observedAt: snapshot.observedAt,
    expiresAt: expiryFor( snapshot ),
  };
  const existing = await first( pocketBaseCollections.flightSnapshots, "lookupKey = {:lookupKey}", { lookupKey } );
  if ( existing ) return pb.collection( pocketBaseCollections.flightSnapshots ).update( String( existing.id ), data );
  try {
    return await pb.collection( pocketBaseCollections.flightSnapshots ).create( data );
  } catch {
    const raced = await first( pocketBaseCollections.flightSnapshots, "lookupKey = {:lookupKey}", { lookupKey } );
    if ( !raced ) throw new Error( "Unable to persist flight snapshot" );
    return pb.collection( pocketBaseCollections.flightSnapshots ).update( String( raced.id ), data );
  }
}

export async function recordFlightMetric( input: { eventType: FlightMetric; key: FlightLookupKey; provider?: string; success: boolean; durationMs?: number; metadata?: Record<string, unknown> } ): Promise<void> {
  try {
    await getPocketBaseClient().collection( pocketBaseCollections.flightProviderEvents ).create( {
      eventType: input.eventType,
      provider: input.provider || "cache",
      lookupKey: flightLookupId( input.key ),
      success: input.success,
      durationMs: Math.max( 0, Math.round( input.durationMs || 0 ) ),
      metadata: input.metadata || {},
      occurredAt: new Date().toISOString(),
    } );
  } catch ( error ) {
    console.warn( "Unable to record flight metric", error );
  }
}

export async function countRecentProviderRequests( provider: string, since: string ): Promise<number> {
  const pb = getPocketBaseClient();
  const result = await pb.collection( pocketBaseCollections.flightProviderEvents ).getList( 1, 1, {
    filter: pb.filter( "eventType = 'provider_request' && provider = {:provider} && occurredAt >= {:since}", { provider, since } ),
    fields: "id",
  } );
  return result.totalItems;
}
