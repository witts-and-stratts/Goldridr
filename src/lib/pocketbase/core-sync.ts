import type { DatabaseLike } from "@/lib/db-client";
import { getPocketBaseClient } from "./client";
import { pocketBaseCollections } from "./collections";
import { isPocketBaseAuthEnabled, isPocketBaseConfigured, isPocketBaseCoreWriteEnabled } from "./config";

interface OutboxRow {
  id: number;
  entity: string;
  legacyKey: string;
  action: "upsert" | "delete";
  attempts: number;
}

function text( value: unknown ): string {
  return value === null || value === undefined ? "" : String( value );
}

function date( value: unknown ): string {
  return typeof value === "string" && value ? value : "";
}

function json( value: unknown ): unknown {
  if ( typeof value !== "string" ) return value || {};
  try {
    return JSON.parse( value );
  } catch {
    return {};
  }
}

function collectionFor( entity: string ): string {
  const collections: Record<string, string> = {
    vehicles: pocketBaseCollections.vehicles,
    chauffeurs: pocketBaseCollections.chauffeurs,
    bookings: pocketBaseCollections.bookings,
    payments: pocketBaseCollections.payments,
    discount_codes: pocketBaseCollections.discounts,
    blocked_slots: pocketBaseCollections.blockedSlots,
    app_settings: pocketBaseCollections.settings,
    sms_consents: pocketBaseCollections.smsConsents,
  };
  const collection = collections[ entity ];
  if ( !collection ) throw new Error( `Unsupported PocketBase outbox entity ${ entity }` );
  return collection;
}

async function find( collection: string, field: string, value: string | number ) {
  const pb = getPocketBaseClient();
  try {
    return await pb.collection( collection ).getFirstListItem( pb.filter( `${ field } = {:value}`, { value } ) );
  } catch ( error ) {
    if ( typeof error === "object" && error !== null && "status" in error && error.status === 404 ) return null;
    throw error;
  }
}

async function relation( collection: string, field: string, value: string | number | null | undefined ): Promise<string> {
  if ( value === null || value === undefined || value === "" ) return "";
  return ( await find( collection, field, value ) )?.id || "";
}

async function save( collection: string, field: string, value: string | number, data: Record<string, unknown> ) {
  const pb = getPocketBaseClient();
  const existing = await find( collection, field, value );
  return existing
    ? pb.collection( collection ).update( existing.id, data )
    : pb.collection( collection ).create( data );
}

async function remove( entity: string, legacyKey: string ): Promise<void> {
  const collection = collectionFor( entity );
  const field = entity === "bookings" ? "reference" : entity === "app_settings" ? "key" : "legacyId";
  const value = [ "chauffeurs", "bookings", "app_settings" ].includes( entity ) ? legacyKey : Number( legacyKey );
  const existing = await find( collection, field, value );
  if ( existing ) await getPocketBaseClient().collection( collection ).delete( existing.id );
  if ( entity === "chauffeurs" ) {
    const user = await find( pocketBaseCollections.users, "legacyUserId", `chauffeur:${ legacyKey }` );
    if ( user ) await getPocketBaseClient().collection( pocketBaseCollections.users ).update( user.id, { status: "inactive" } );
  }
}

async function syncVehicle( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM vehicles WHERE id = ?" ).get( Number( key ) ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "vehicles", key );
  await save( pocketBaseCollections.vehicles, "legacyId", Number( key ), {
    legacyId: Number( row.id ),
    make: text( row.make ),
    model: text( row.model ),
    year: row.year === null || row.year === undefined ? null : Number( row.year ),
    colour: text( row.colour ),
    plate: text( row.plate ),
    status: text( row.status ) || "active",
    sourceCreatedAt: date( row.createdAt ),
  } );
}

async function syncChauffeur( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM chauffeurs WHERE id = ?" ).get( key ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "chauffeurs", key );
  const user = await find( pocketBaseCollections.users, "legacyUserId", `chauffeur:${ key }` );
  if ( user ) {
    await getPocketBaseClient().collection( pocketBaseCollections.users ).update( user.id, {
      name: text( row.name ),
      email: text( row.email ),
      status: text( row.status ) === "active" ? "active" : "inactive",
    } );
  }
  await save( pocketBaseCollections.chauffeurs, "legacyId", key, {
    legacyId: key,
    user: user?.id || "",
    name: text( row.name ),
    email: text( row.email ),
    phone: text( row.phone ),
    status: text( row.status ) || "active",
    vehicle: await relation( pocketBaseCollections.vehicles, "legacyId", row.vehicleId as number | null ),
    avatarUrl: text( row.avatarUrl ),
  } );
}

export async function syncPocketBaseChauffeurCredentials( chauffeur: {
  id: string;
  name: string;
  email: string;
  status: string;
}, password?: string | null ): Promise<void> {
  if ( !isPocketBaseCoreWriteEnabled() && !isPocketBaseAuthEnabled() ) return;
  if ( !isPocketBaseConfigured() ) throw new Error( "PocketBase chauffeur authentication is enabled but PocketBase is not configured" );
  const legacyUserId = `chauffeur:${ chauffeur.id }`;
  const existing = await find( pocketBaseCollections.users, "legacyUserId", legacyUserId );
  const data: Record<string, unknown> = {
    email: chauffeur.email,
    emailVisibility: false,
    verified: true,
    name: chauffeur.name,
    legacyUserId,
    role: "chauffeur",
    status: chauffeur.status === "active" ? "active" : "inactive",
    chauffeurId: chauffeur.id,
  };
  if ( password?.trim() ) {
    data.password = password.trim();
    data.passwordConfirm = password.trim();
  }
  const pb = getPocketBaseClient();
  if ( existing ) {
    await pb.collection( pocketBaseCollections.users ).update( existing.id, data );
    return;
  }
  const initialPassword = password?.trim() || process.env.CHAUFFEUR_DEFAULT_PASSWORD?.trim();
  if ( !initialPassword ) throw new Error( "CHAUFFEUR_DEFAULT_PASSWORD is required to create a PocketBase chauffeur" );
  await pb.collection( pocketBaseCollections.users ).create( {
    ...data,
    password: initialPassword,
    passwordConfirm: initialPassword,
  } );
}

async function syncBooking( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( key ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "bookings", key );
  await save( pocketBaseCollections.bookings, "reference", key, {
    legacyId: Number( row.id ),
    reference: key,
    tripType: text( row.tripType ),
    pickupDate: text( row.date ),
    pickupTime: text( row.time ),
    duration: Number( row.duration || 0 ),
    passengerName: text( row.name ),
    passengerEmail: text( row.email ),
    passengerPhone: text( row.phone ),
    notes: text( row.notes ),
    status: text( row.status ) || "pending",
    tripDetails: json( row.tripDetails ),
    chauffeur: await relation( pocketBaseCollections.chauffeurs, "legacyId", text( row.chauffeurId ) ),
    smsConsentVersion: text( row.smsConsentVersion ),
    smsConsentedAt: date( row.smsConsentedAt ),
    pin: text( row.pin ),
    pinConfirmedAt: date( row.pinConfirmedAt ),
    sourceCreatedAt: date( row.createdAt ),
  } );
}

async function syncPayment( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM payments WHERE id = ?" ).get( Number( key ) ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "payments", key );
  const bookingReference = text( row.bookingReference );
  const booking = await relation( pocketBaseCollections.bookings, "reference", bookingReference );
  if ( !booking ) throw new Error( `PocketBase booking ${ bookingReference } is unavailable for payment ${ key }` );
  await save( pocketBaseCollections.payments, "legacyId", Number( key ), {
    legacyId: Number( row.id ),
    booking,
    bookingReference,
    amountCents: Number( row.amountCents || 0 ),
    currency: text( row.currency ) || "USD",
    method: text( row.method ),
    status: text( row.status ) || "pending",
    transactionReference: text( row.transactionReference ),
    notes: text( row.notes ),
    paidAt: date( row.paidAt ),
    sourceCreatedAt: date( row.createdAt ),
    sourceUpdatedAt: date( row.updatedAt ),
  } );
}

async function syncDiscount( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM discount_codes WHERE id = ?" ).get( Number( key ) ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "discount_codes", key );
  await save( pocketBaseCollections.discounts, "legacyId", Number( key ), {
    legacyId: Number( row.id ),
    code: text( row.code ),
    label: text( row.label ),
    kind: text( row.kind ),
    value: Number( row.value || 0 ),
    active: Boolean( row.active ),
    maxRedemptions: row.maxRedemptions === null || row.maxRedemptions === undefined ? null : Number( row.maxRedemptions ),
    redemptions: Number( row.redemptions || 0 ),
    expiresAt: date( row.expiresAt ),
    sourceCreatedAt: date( row.createdAt ),
    sourceUpdatedAt: date( row.updatedAt ),
  } );
}

async function syncBlockedSlot( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM blocked_slots WHERE id = ?" ).get( Number( key ) ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "blocked_slots", key );
  await save( pocketBaseCollections.blockedSlots, "legacyId", Number( key ), {
    legacyId: Number( row.id ),
    title: text( row.title ),
    startDate: text( row.date ),
    startTime: text( row.time ),
    duration: Number( row.duration || 0 ),
    recurring: text( row.recurring ) || "none",
    endDate: text( row.endDate ),
    isFullDay: Boolean( row.isFullDay ),
    chauffeur: await relation( pocketBaseCollections.chauffeurs, "legacyId", text( row.chauffeurId ) ),
    sourceCreatedAt: date( row.createdAt ),
  } );
}

async function syncSetting( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM app_settings WHERE key = ?" ).get( key ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "app_settings", key );
  await save( pocketBaseCollections.settings, "key", key, {
    key,
    value: text( row.value ),
    sourceUpdatedAt: date( row.updatedAt ),
  } );
}

async function syncConsent( db: DatabaseLike, key: string ) {
  const row = await db.prepare( "SELECT * FROM sms_consents WHERE id = ?" ).get( Number( key ) ) as Record<string, unknown> | undefined;
  if ( !row ) return remove( "sms_consents", key );
  await save( pocketBaseCollections.smsConsents, "legacyId", Number( key ), {
    legacyId: Number( row.id ),
    customerEmail: text( row.customerEmail ),
    phone: text( row.phone ),
    consentVersion: text( row.consentVersion ),
    consentedAt: date( row.consentedAt ),
    revokedAt: date( row.revokedAt ),
    sourceCreatedAt: date( row.createdAt ),
  } );
}

async function syncRow( db: DatabaseLike, row: OutboxRow ): Promise<void> {
  if ( row.action === "delete" ) return remove( row.entity, row.legacyKey );
  if ( row.entity === "vehicles" ) return syncVehicle( db, row.legacyKey );
  if ( row.entity === "chauffeurs" ) return syncChauffeur( db, row.legacyKey );
  if ( row.entity === "bookings" ) return syncBooking( db, row.legacyKey );
  if ( row.entity === "payments" ) return syncPayment( db, row.legacyKey );
  if ( row.entity === "discount_codes" ) return syncDiscount( db, row.legacyKey );
  if ( row.entity === "blocked_slots" ) return syncBlockedSlot( db, row.legacyKey );
  if ( row.entity === "app_settings" ) return syncSetting( db, row.legacyKey );
  if ( row.entity === "sms_consents" ) return syncConsent( db, row.legacyKey );
  throw new Error( `Unsupported PocketBase outbox entity ${ row.entity }` );
}

export async function drainPocketBaseCoreOutbox( db: DatabaseLike, limit = 50 ): Promise<void> {
  if ( !isPocketBaseCoreWriteEnabled() ) return;
  if ( !isPocketBaseConfigured() ) throw new Error( "PocketBase core writes are enabled but PocketBase is not configured" );
  const rows = await db.prepare( `
    SELECT id, entity, legacyKey, action, attempts
    FROM pocketbase_core_outbox
    WHERE datetime(nextAttemptAt) <= datetime('now')
    ORDER BY id
    LIMIT ?
  ` ).all( limit ) as OutboxRow[];

  for ( const row of rows ) {
    try {
      await syncRow( db, row );
      await db.prepare( "DELETE FROM pocketbase_core_outbox WHERE id = ?" ).run( row.id );
    } catch ( error ) {
      const attempts = row.attempts + 1;
      const delaySeconds = Math.min( 300, 2 ** Math.min( attempts, 8 ) );
      await db.prepare( `
        UPDATE pocketbase_core_outbox
        SET attempts = ?, nextAttemptAt = datetime('now', ?), lastError = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      ` ).run( attempts, `+${ delaySeconds } seconds`, error instanceof Error ? error.message : String( error ), row.id );
    }
  }
}
