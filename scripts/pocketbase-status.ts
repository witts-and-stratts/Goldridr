import fs from "fs";
import path from "path";
import PocketBase from "pocketbase";

function loadEnvFile( filePath: string ): void {
  if ( !fs.existsSync( filePath ) ) return;
  for ( const line of fs.readFileSync( filePath, "utf8" ).split( /\r?\n/ ) ) {
    const trimmed = line.trim();
    if ( !trimmed || trimmed.startsWith( "#" ) ) continue;
    const index = trimmed.indexOf( "=" );
    if ( index <= 0 ) continue;
    const key = trimmed.slice( 0, index ).trim();
    if ( process.env[ key ] === undefined ) process.env[ key ] = trimmed.slice( index + 1 );
  }
}

loadEnvFile( path.join( process.cwd(), ".env" ) );
loadEnvFile( path.join( process.cwd(), ".env.local" ) );

function requiredEnv( name: string ): string {
  const value = process.env[ name ]?.trim();
  if ( !value ) throw new Error( `${ name } is required` );
  return value;
}

async function optionalCount(
  db: Awaited<ReturnType<typeof import("@/lib/db-client").getDb>>,
  table: string
): Promise<number> {
  try {
    const result = await db.execute( `SELECT COUNT(*) AS count FROM ${ table }` );
    return Number( result.rows[ 0 ]?.count || 0 );
  } catch ( error ) {
    if ( error instanceof Error && error.message.includes( "no such table" ) ) return 0;
    throw error;
  }
}

async function main() {
  const pb = new PocketBase( requiredEnv( "POCKETBASE_URL" ).replace( /\/$/, "" ) );
  pb.autoCancellation( false );
  pb.authStore.save( requiredEnv( "POCKETBASE_SUPERUSER_TOKEN" ) );
  const health = await pb.health.check();
  const { getDb } = await import( "@/lib/db-client" );
  const db = await getDb();
  const sqliteCounts: Record<string, number> = {};
  const pocketBaseCounts: Record<string, number> = {};
  const tables = [
    "vehicles",
    "chauffeurs",
    "bookings",
    "payments",
    "discount_codes",
    "blocked_slots",
    "app_settings",
    "sms_consents",
    "notifications",
    "notification_recipients",
    "notification_preferences",
    "notification_deliveries",
    "push_tokens",
    "notification_provider_events",
  ];

  for ( const table of tables ) {
    const result = await db.execute( `SELECT COUNT(*) AS count FROM ${ table }` );
    sqliteCounts[ table ] = Number( result.rows[ 0 ]?.count || 0 );
    pocketBaseCounts[ table ] = ( await pb.collection( table ).getList( 1, 1, { fields: "id" } ) ).totalItems;
  }
  const pendingOutbox = await optionalCount( db, "pocketbase_notification_outbox" );
  const pendingCoreOutbox = await optionalCount( db, "pocketbase_core_outbox" );

  console.log( JSON.stringify( {
    health,
    flags: {
      auth: process.env.POCKETBASE_AUTH === "true",
      coreWrite: process.env.POCKETBASE_CORE_WRITE === "true",
      notificationWrite: process.env.POCKETBASE_NOTIFICATIONS_WRITE === "true",
      notificationRead: process.env.POCKETBASE_NOTIFICATIONS_READ === "true",
      deliveryQueue: process.env.POCKETBASE_DELIVERY_QUEUE === "true",
    },
    sqlite: sqliteCounts,
    pocketBase: pocketBaseCounts,
    pendingOutbox,
    pendingCoreOutbox,
  }, null, 2 ) );
}

main().catch( error => {
  console.error( error );
  process.exitCode = 1;
} );
