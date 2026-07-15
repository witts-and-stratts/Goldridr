import { getPocketBaseClient } from "./client";
import { pocketBaseCollections } from "./collections";
import { first } from "./core";
import { createHash, randomBytes } from "crypto";

export interface PocketBaseChauffeur {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  avatarUrl: string | null;
  vehicleId: number | null;
}

function chauffeurRecord( record: Record<string, unknown> ): PocketBaseChauffeur {
  const vehicle = record.expand && typeof record.expand === "object"
    ? ( record.expand as Record<string, unknown> ).vehicle as Record<string, unknown> | undefined
    : undefined;
  return {
    id: String( record.legacyId ),
    name: String( record.name ),
    email: String( record.email ),
    phone: record.phone ? String( record.phone ) : "",
    status: String( record.status ),
    avatarUrl: record.avatarUrl ? String( record.avatarUrl ) : null,
    vehicleId: vehicle?.legacyId === undefined ? null : Number( vehicle.legacyId ),
  };
}

export async function getPocketBaseChauffeurById( id: string ): Promise<PocketBaseChauffeur | undefined> {
  const record = await first( pocketBaseCollections.chauffeurs, "legacyId = {:id} && status = 'active'", { id } );
  return record ? chauffeurRecord( record ) : undefined;
}

export async function getPocketBaseChauffeurByEmail( email: string ): Promise<PocketBaseChauffeur | undefined> {
  const record = await first( pocketBaseCollections.chauffeurs, "email = {:email} && status = 'active'", { email: email.trim().toLowerCase() } );
  return record ? chauffeurRecord( record ) : undefined;
}

export async function updatePocketBaseChauffeur( id: string, updates: { password?: string; name?: string; email?: string; phone?: string | null } ): Promise<PocketBaseChauffeur | undefined> {
  const record = await first( pocketBaseCollections.chauffeurs, "legacyId = {:id} && status = 'active'", { id } );
  if ( !record ) return undefined;
  const data: Record<string, unknown> = {};
  if ( updates.name !== undefined ) data.name = updates.name.trim();
  if ( updates.email !== undefined ) data.email = updates.email.trim().toLowerCase();
  if ( updates.phone !== undefined ) data.phone = updates.phone?.trim() || "";
  if ( updates.password?.trim() ) {
    data.password = updates.password.trim();
    data.passwordConfirm = updates.password.trim();
  }
  const updated = await getPocketBaseClient().collection( pocketBaseCollections.chauffeurs ).update( record.id, data );
  if ( updates.password?.trim() && updated.user ) {
    await getPocketBaseClient().collection( pocketBaseCollections.users ).update( String( updated.user ), {
      password: updates.password.trim(),
      passwordConfirm: updates.password.trim(),
    } );
  }
  return chauffeurRecord( updated );
}

export interface PocketBaseMockSmsMessage {
  id: number;
  sid: string;
  accountSid: string | null;
  fromNumber: string;
  toNumber: string;
  body: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

function smsRecord( record: Record<string, unknown> ): PocketBaseMockSmsMessage {
  return {
    id: 0,
    sid: String( record.sid ),
    accountSid: record.accountSid ? String( record.accountSid ) : null,
    fromNumber: String( record.fromNumber ),
    toNumber: String( record.toNumber ),
    body: String( record.body ),
    status: String( record.status ),
    errorMessage: record.errorMessage ? String( record.errorMessage ) : null,
    createdAt: String( record.created ),
    updatedAt: String( record.updated ),
  };
}

function mockSid(): string {
  return `SM${ Math.random().toString( 36 ).slice( 2, 18 ).toUpperCase().padEnd( 32, "0" ).slice( 0, 32 ) }`;
}

export async function insertPocketBaseMockSmsMessage( input: {
  sid?: string;
  accountSid?: string | null;
  fromNumber: string;
  toNumber: string;
  body: string;
  status?: string;
  errorMessage?: string | null;
} ): Promise<PocketBaseMockSmsMessage> {
  const record = await getPocketBaseClient().collection( pocketBaseCollections.mockSmsMessages ).create( {
    sid: input.sid || mockSid(),
    accountSid: input.accountSid || "",
    fromNumber: input.fromNumber,
    toNumber: input.toNumber,
    body: input.body,
    status: input.status || "queued",
    errorMessage: input.errorMessage || "",
  } );
  return smsRecord( record );
}

export async function updatePocketBaseMockSmsMessageStatus( sid: string, status: string, errorMessage?: string | null ): Promise<boolean> {
  const record = await first( pocketBaseCollections.mockSmsMessages, "sid = {:sid}", { sid } );
  if ( !record ) return false;
  await getPocketBaseClient().collection( pocketBaseCollections.mockSmsMessages ).update( record.id, {
    status,
    errorMessage: errorMessage || "",
  } );
  return true;
}

export async function listPocketBaseMockSmsMessages( limit = 50 ): Promise<PocketBaseMockSmsMessage[]> {
  const records = await getPocketBaseClient().collection( pocketBaseCollections.mockSmsMessages ).getList( 1, limit, {
    sort: "-created",
  } );
  return records.items.map( smsRecord );
}

export async function clearPocketBaseMockSmsMessages(): Promise<number> {
  const records = await getPocketBaseClient().collection( pocketBaseCollections.mockSmsMessages ).getFullList( { fields: "id" } );
  await Promise.all( records.map( record => getPocketBaseClient().collection( pocketBaseCollections.mockSmsMessages ).delete( record.id ) ) );
  return records.length;
}

export async function createPocketBasePasswordResetToken( chauffeurId: string ): Promise<string> {
  const chauffeur = await first( pocketBaseCollections.chauffeurs, "legacyId = {:id}", { id: chauffeurId } );
  if ( !chauffeur ) throw new Error( "Chauffeur not found" );
  const pb = getPocketBaseClient();
  const existing = await pb.collection( pocketBaseCollections.passwordResetTokens ).getFullList( {
    filter: pb.filter( "chauffeur = {:chauffeur}", { chauffeur: chauffeur.id } ),
    fields: "id",
  } );
  await Promise.all( existing.map( record => pb.collection( pocketBaseCollections.passwordResetTokens ).delete( record.id ) ) );
  const token = randomBytes( 32 ).toString( "hex" );
  await pb.collection( pocketBaseCollections.passwordResetTokens ).create( {
    tokenHash: createHash( "sha256" ).update( token ).digest( "hex" ),
    chauffeur: chauffeur.id,
    expiresAt: new Date( Date.now() + 60 * 60 * 1000 ).toISOString(),
  } );
  return token;
}

export async function consumePocketBasePasswordResetToken( token: string ): Promise<string | null> {
  const record = await first( pocketBaseCollections.passwordResetTokens, "tokenHash = {:tokenHash}", {
    tokenHash: createHash( "sha256" ).update( token ).digest( "hex" ),
  } );
  if ( !record ) return null;
  const pb = getPocketBaseClient();
  await pb.collection( pocketBaseCollections.passwordResetTokens ).delete( record.id );
  if ( new Date( String( record.expiresAt ) ).getTime() < Date.now() ) return null;
  const chauffeur = await pb.collection( pocketBaseCollections.chauffeurs ).getOne( String( record.chauffeur ) );
  return String( chauffeur.legacyId );
}
