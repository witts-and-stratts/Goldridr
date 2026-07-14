import fs from "fs";
import path from "path";
import PocketBase, { ClientResponseError, type RecordModel } from "pocketbase";

function loadEnvFile( filePath: string ): void {
  if ( !fs.existsSync( filePath ) ) return;
  const contents = fs.readFileSync( filePath, "utf8" );
  for ( const line of contents.split( /\r?\n/ ) ) {
    const trimmed = line.trim();
    if ( !trimmed || trimmed.startsWith( "#" ) ) continue;
    const index = trimmed.indexOf( "=" );
    if ( index <= 0 ) continue;
    const key = trimmed.slice( 0, index ).trim();
    if ( process.env[ key ] !== undefined ) continue;
    process.env[ key ] = trimmed.slice( index + 1 );
  }
}

loadEnvFile( path.join( process.cwd(), ".env" ) );
loadEnvFile( path.join( process.cwd(), ".env.local" ) );

function requiredEnv( name: string ): string {
  const value = process.env[ name ]?.trim();
  if ( !value ) throw new Error( `${ name } is required` );
  return value;
}

function jsonValue( value: unknown, fallback: unknown ): unknown {
  if ( value === null || value === undefined || value === "" ) return fallback;
  if ( typeof value !== "string" ) return value;
  try {
    return JSON.parse( value );
  } catch {
    return fallback;
  }
}

function nullableDate( value: unknown ): string {
  return typeof value === "string" && value ? value : "";
}

function text( value: unknown ): string {
  return value === null || value === undefined ? "" : String( value );
}

async function findOne(
  pb: PocketBase,
  collection: string,
  expression: string,
  params: Record<string, unknown>
): Promise<RecordModel | null> {
  try {
    return await pb.collection( collection ).getFirstListItem( pb.filter( expression, params ) );
  } catch ( error ) {
    if ( error instanceof ClientResponseError && error.status === 404 ) return null;
    throw error;
  }
}

async function upsert(
  pb: PocketBase,
  collection: string,
  expression: string,
  params: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<RecordModel> {
  const existing = await findOne( pb, collection, expression, params );
  if ( existing ) return pb.collection( collection ).update( existing.id, data );
  return pb.collection( collection ).create( data );
}

async function migrateUsers( pb: PocketBase, db: Awaited<ReturnType<typeof import("@/lib/db-client").getDb>> ) {
  const adminEmail = requiredEnv( "ADMIN_EMAIL" );
  const adminPassword = requiredEnv( "ADMIN_PASSWORD" );
  const admin = await findOne( pb, "app_users", "legacyUserId = {:legacyUserId}", { legacyUserId: "admin" } );
  const adminData = {
    email: adminEmail,
    emailVisibility: false,
    verified: true,
    name: process.env.ADMIN_NAME?.trim() || "General Dispatcher",
    legacyUserId: "admin",
    role: "admin",
    status: "active",
  };
  if ( admin ) {
    await pb.collection( "app_users" ).update( admin.id, adminData );
  } else {
    await pb.collection( "app_users" ).create( {
      ...adminData,
      password: adminPassword,
      passwordConfirm: adminPassword,
    } );
  }

  const defaultPassword = requiredEnv( "CHAUFFEUR_DEFAULT_PASSWORD" );
  const result = await db.execute( "SELECT id, name, email, status FROM chauffeurs ORDER BY name" );
  for ( const chauffeur of result.rows ) {
    const legacyUserId = `chauffeur:${ text( chauffeur.id ) }`;
    const existing = await findOne( pb, "app_users", "legacyUserId = {:legacyUserId}", { legacyUserId } );
    const data = {
      email: text( chauffeur.email ),
      emailVisibility: false,
      verified: true,
      name: text( chauffeur.name ),
      legacyUserId,
      role: "chauffeur",
      status: text( chauffeur.status ) === "active" ? "active" : "inactive",
      chauffeurId: text( chauffeur.id ),
    };
    if ( existing ) {
      await pb.collection( "app_users" ).update( existing.id, data );
    } else {
      await pb.collection( "app_users" ).create( {
        ...data,
        password: defaultPassword,
        passwordConfirm: defaultPassword,
      } );
    }
  }

  return { admins: 1, chauffeurs: result.rows.length };
}

async function migrateCore( pb: PocketBase, db: Awaited<ReturnType<typeof import("@/lib/db-client").getDb>> ) {
  const vehicles = await db.execute( "SELECT * FROM vehicles ORDER BY id" );
  const vehicleIds = new Map<number, string>();
  for ( const row of vehicles.rows ) {
    const record = await upsert(
      pb,
      "vehicles",
      "legacyId = {:legacyId}",
      { legacyId: Number( row.id ) },
      {
        legacyId: Number( row.id ),
        make: text( row.make ),
        model: text( row.model ),
        year: row.year === null || row.year === undefined ? null : Number( row.year ),
        colour: text( row.colour ),
        plate: text( row.plate ),
        status: text( row.status ) || "active",
        sourceCreatedAt: nullableDate( row.createdAt ),
      }
    );
    vehicleIds.set( Number( row.id ), record.id );
  }

  const appUsers = await pb.collection( "app_users" ).getFullList();
  const userIds = new Map( appUsers.map( user => [ String( user.legacyUserId ), user.id ] ) );
  const chauffeurs = await db.execute( "SELECT * FROM chauffeurs ORDER BY name" );
  const chauffeurIds = new Map<string, string>();
  for ( const row of chauffeurs.rows ) {
    const legacyId = text( row.id );
    const record = await upsert(
      pb,
      "chauffeurs",
      "legacyId = {:legacyId}",
      { legacyId },
      {
        legacyId,
        user: userIds.get( `chauffeur:${ legacyId }` ) || "",
        name: text( row.name ),
        email: text( row.email ),
        phone: text( row.phone ),
        status: text( row.status ) || "active",
        vehicle: vehicleIds.get( Number( row.vehicleId ) ) || "",
        avatarUrl: text( row.avatarUrl ),
      }
    );
    chauffeurIds.set( legacyId, record.id );
  }

  const bookings = await db.execute( "SELECT * FROM bookings ORDER BY id" );
  const bookingIds = new Map<string, string>();
  for ( const row of bookings.rows ) {
    const reference = text( row.reference );
    const record = await upsert(
      pb,
      "bookings",
      "reference = {:reference}",
      { reference },
      {
        legacyId: Number( row.id ),
        reference,
        tripType: text( row.tripType ),
        pickupDate: text( row.date ),
        pickupTime: text( row.time ),
        duration: Number( row.duration || 0 ),
        passengerName: text( row.name ),
        passengerEmail: text( row.email ),
        passengerPhone: text( row.phone ),
        notes: text( row.notes ),
        status: text( row.status ) || "pending",
        tripDetails: jsonValue( row.tripDetails, {} ),
        chauffeur: chauffeurIds.get( text( row.chauffeurId ) ) || "",
        smsConsentVersion: text( row.smsConsentVersion ),
        smsConsentedAt: nullableDate( row.smsConsentedAt ),
        pin: text( row.pin ),
        pinConfirmedAt: nullableDate( row.pinConfirmedAt ),
        sourceCreatedAt: nullableDate( row.createdAt ),
      }
    );
    bookingIds.set( reference, record.id );
  }

  const payments = await db.execute( "SELECT * FROM payments ORDER BY id" );
  for ( const row of payments.rows ) {
    const bookingReference = text( row.bookingReference );
    const booking = bookingIds.get( bookingReference );
    if ( !booking ) throw new Error( `Missing booking ${ bookingReference } for payment ${ row.id }` );
    await upsert(
      pb,
      "payments",
      "legacyId = {:legacyId}",
      { legacyId: Number( row.id ) },
      {
        legacyId: Number( row.id ),
        booking,
        bookingReference,
        amountCents: Number( row.amountCents || 0 ),
        currency: text( row.currency ) || "USD",
        method: text( row.method ),
        status: text( row.status ) || "pending",
        transactionReference: text( row.transactionReference ),
        notes: text( row.notes ),
        paidAt: nullableDate( row.paidAt ),
        sourceCreatedAt: nullableDate( row.createdAt ),
        sourceUpdatedAt: nullableDate( row.updatedAt ),
      }
    );
  }

  const discounts = await db.execute( "SELECT * FROM discount_codes ORDER BY id" );
  for ( const row of discounts.rows ) {
    await upsert(
      pb,
      "discount_codes",
      "legacyId = {:legacyId}",
      { legacyId: Number( row.id ) },
      {
        legacyId: Number( row.id ),
        code: text( row.code ),
        label: text( row.label ),
        kind: text( row.kind ),
        value: Number( row.value || 0 ),
        active: Boolean( row.active ),
        maxRedemptions: row.maxRedemptions === null || row.maxRedemptions === undefined
          ? null
          : Number( row.maxRedemptions ),
        redemptions: Number( row.redemptions || 0 ),
        expiresAt: nullableDate( row.expiresAt ),
        sourceCreatedAt: nullableDate( row.createdAt ),
        sourceUpdatedAt: nullableDate( row.updatedAt ),
      }
    );
  }

  const blockedSlots = await db.execute( "SELECT * FROM blocked_slots ORDER BY id" );
  for ( const row of blockedSlots.rows ) {
    await upsert(
      pb,
      "blocked_slots",
      "legacyId = {:legacyId}",
      { legacyId: Number( row.id ) },
      {
        legacyId: Number( row.id ),
        title: text( row.title ),
        startDate: text( row.date ),
        startTime: text( row.time ),
        duration: Number( row.duration || 0 ),
        recurring: text( row.recurring ) || "none",
        endDate: text( row.endDate ),
        isFullDay: Boolean( row.isFullDay ),
        chauffeur: chauffeurIds.get( text( row.chauffeurId ) ) || "",
        sourceCreatedAt: nullableDate( row.createdAt ),
      }
    );
  }

  const settings = await db.execute( "SELECT * FROM app_settings ORDER BY key" );
  for ( const row of settings.rows ) {
    await upsert(
      pb,
      "app_settings",
      "key = {:key}",
      { key: text( row.key ) },
      { key: text( row.key ), value: text( row.value ), sourceUpdatedAt: nullableDate( row.updatedAt ) }
    );
  }

  const consents = await db.execute( "SELECT * FROM sms_consents ORDER BY id" );
  for ( const row of consents.rows ) {
    await upsert(
      pb,
      "sms_consents",
      "legacyId = {:legacyId}",
      { legacyId: Number( row.id ) },
      {
        legacyId: Number( row.id ),
        customerEmail: text( row.customerEmail ),
        phone: text( row.phone ),
        consentVersion: text( row.consentVersion ),
        consentedAt: nullableDate( row.consentedAt ),
        revokedAt: nullableDate( row.revokedAt ),
        sourceCreatedAt: nullableDate( row.createdAt ),
      }
    );
  }

  return {
    vehicles: vehicles.rows.length,
    chauffeurs: chauffeurs.rows.length,
    bookings: bookings.rows.length,
    payments: payments.rows.length,
    discounts: discounts.rows.length,
    blockedSlots: blockedSlots.rows.length,
    settings: settings.rows.length,
    smsConsents: consents.rows.length,
  };
}

async function migrateNotifications( pb: PocketBase, db: Awaited<ReturnType<typeof import("@/lib/db-client").getDb>> ) {
  const notificationResult = await db.execute( "SELECT * FROM notifications ORDER BY id" );
  const notificationIds = new Map<number, string>();

  for ( const row of notificationResult.rows ) {
    const record = await upsert(
      pb,
      "notifications",
      "eventKey = {:eventKey}",
      { eventKey: text( row.eventKey ) },
      {
        legacyId: Number( row.id ),
        eventKey: text( row.eventKey ),
        type: text( row.type ),
        category: text( row.category ),
        title: text( row.title ),
        body: text( row.body ),
        bookingReference: text( row.bookingReference ),
        actorUserId: text( row.actorUserId ),
        metadata: jsonValue( row.metadata, {} ),
        sourceCreatedAt: nullableDate( row.createdAt ),
      }
    );
    notificationIds.set( Number( row.id ), record.id );
  }

  const recipientResult = await db.execute( "SELECT * FROM notification_recipients ORDER BY id" );
  for ( const row of recipientResult.rows ) {
    const notification = notificationIds.get( Number( row.notificationId ) );
    if ( !notification ) {
      console.warn( `Skipping orphan notification recipient ${ row.id } (notification ${ row.notificationId })` );
      continue;
    }
    await upsert(
      pb,
      "notification_recipients",
      "legacyId = {:legacyId}",
      { legacyId: Number( row.id ) },
      {
        legacyId: Number( row.id ),
        notification,
        userId: text( row.userId ),
        readAt: nullableDate( row.readAt ),
        sourceCreatedAt: nullableDate( row.createdAt ),
      }
    );
  }

  const preferenceResult = await db.execute( "SELECT * FROM notification_preferences ORDER BY userId, category" );
  for ( const row of preferenceResult.rows ) {
    await upsert(
      pb,
      "notification_preferences",
      "userId = {:userId} && category = {:category}",
      { userId: text( row.userId ), category: text( row.category ) },
      {
        userId: text( row.userId ),
        category: text( row.category ),
        inApp: Boolean( row.inApp ),
        email: Boolean( row.email ),
        sms: Boolean( row.sms ),
        sourceUpdatedAt: nullableDate( row.updatedAt ),
      }
    );
  }

  const deliveryResult = await db.execute( "SELECT * FROM notification_deliveries ORDER BY id" );
  for ( const row of deliveryResult.rows ) {
    const notification = notificationIds.get( Number( row.notificationId ) );
    if ( !notification ) {
      console.warn( `Skipping orphan notification delivery ${ row.id } (notification ${ row.notificationId })` );
      continue;
    }
    await upsert(
      pb,
      "notification_deliveries",
      "idempotencyKey = {:idempotencyKey}",
      { idempotencyKey: text( row.idempotencyKey ) },
      {
        legacyId: Number( row.id ),
        notification,
        channel: text( row.channel ),
        recipient: text( row.recipient ),
        template: text( row.template ),
        payload: jsonValue( row.payload, {} ),
        idempotencyKey: text( row.idempotencyKey ),
        status: text( row.status ),
        scheduledAt: nullableDate( row.scheduledAt ),
        nextAttemptAt: nullableDate( row.nextAttemptAt ),
        attempts: Number( row.attempts || 0 ),
        leaseToken: text( row.leaseToken ),
        leaseExpiresAt: nullableDate( row.leaseExpiresAt ),
        provider: text( row.provider ),
        providerMessageId: text( row.providerMessageId ),
        accepted: jsonValue( row.accepted, [] ),
        rejected: jsonValue( row.rejected, [] ),
        response: text( row.response ),
        providerMetadata: jsonValue( row.providerMetadata, {} ),
        lastError: text( row.lastError ),
        sourceCreatedAt: nullableDate( row.createdAt ),
        sourceUpdatedAt: nullableDate( row.updatedAt ),
      }
    );
  }

  const tokenResult = await db.execute( "SELECT * FROM push_tokens ORDER BY token" );
  for ( const row of tokenResult.rows ) {
    const platform = [ "ios", "android", "web" ].includes( text( row.platform ) ) ? text( row.platform ) : "unknown";
    await upsert(
      pb,
      "push_tokens",
      "token = {:token}",
      { token: text( row.token ) },
      {
        token: text( row.token ),
        userId: text( row.userId ),
        platform,
        sourceCreatedAt: nullableDate( row.createdAt ),
        sourceUpdatedAt: nullableDate( row.updatedAt ),
      }
    );
  }

  const eventResult = await db.execute( "SELECT * FROM notification_provider_events ORDER BY id" );
  for ( const row of eventResult.rows ) {
    await upsert(
      pb,
      "notification_provider_events",
      "provider = {:provider} && providerEventId = {:providerEventId}",
      { provider: text( row.provider ), providerEventId: text( row.providerEventId ) },
      {
        legacyId: Number( row.id ),
        provider: text( row.provider ),
        providerEventId: text( row.providerEventId ),
        providerMessageId: text( row.providerMessageId ),
        eventType: text( row.eventType ),
        payload: jsonValue( row.payload, {} ),
        sourceReceivedAt: nullableDate( row.receivedAt ),
      }
    );
  }

  return {
    notifications: notificationResult.rows.length,
    recipients: recipientResult.rows.length,
    preferences: preferenceResult.rows.length,
    deliveries: deliveryResult.rows.length,
    pushTokens: tokenResult.rows.length,
    providerEvents: eventResult.rows.length,
  };
}

async function main() {
  const url = requiredEnv( "POCKETBASE_URL" ).replace( /\/$/, "" );
  const token = requiredEnv( "POCKETBASE_SUPERUSER_TOKEN" );
  const pb = new PocketBase( url );
  pb.autoCancellation( false );
  pb.authStore.save( token );
  await pb.health.check();

  const { getDb } = await import( "@/lib/db-client" );
  const db = await getDb();
  const users = await migrateUsers( pb, db );
  const core = await migrateCore( pb, db );
  const notifications = await migrateNotifications( pb, db );
  console.log( JSON.stringify( { users, core, notifications }, null, 2 ) );
}

main().catch( error => {
  console.error( error );
  process.exitCode = 1;
} );
