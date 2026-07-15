import type { RecordModel } from "pocketbase";
import { getPocketBaseClient } from "./client";
import { pocketBaseCollections } from "./collections";

type Fields = Record<string, unknown>;

export function pbDate( value?: string | null ): string {
  return value || new Date().toISOString();
}

export function legacyId(): number {
  return Date.now() * 1000 + Math.floor( Math.random() * 1000 );
}

export async function first( collection: string, filter: string, params: Fields = {} ): Promise<RecordModel | undefined> {
  try {
    const pb = getPocketBaseClient();
    return await pb.collection( collection ).getFirstListItem( pb.filter( filter, params ) );
  } catch ( error ) {
    if ( error && typeof error === "object" && "status" in error && error.status === 404 ) return undefined;
    throw error;
  }
}

export async function byLegacyId( collection: string, id: number ): Promise<RecordModel | undefined> {
  return first( collection, "legacyId = {:id}", { id } );
}

export async function createWithLegacyId( collection: string, data: Fields ): Promise<RecordModel> {
  return getPocketBaseClient().collection( collection ).create( { legacyId: legacyId(), ...data } );
}

export async function getChauffeurRecord( id: string ): Promise<RecordModel | undefined> {
  return first( pocketBaseCollections.chauffeurs, "legacyId = {:id}", { id } );
}
