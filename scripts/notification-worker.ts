import fs from "fs";
import path from "path";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";

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

function positiveInteger( value: string | undefined, fallback: number ): number {
  const parsed = Number( value );
  return Number.isSafeInteger( parsed ) && parsed > 0 ? parsed : fallback;
}

const pollMs = positiveInteger( process.env.NOTIFICATION_POLL_MS, 500 );
const batchSize = positiveInteger( process.env.NOTIFICATION_BATCH_SIZE, 20 );
const concurrency = positiveInteger( process.env.NOTIFICATION_CONCURRENCY, 5 );
const readinessFile = process.env.NOTIFICATION_READY_FILE;
let stopping = false;
let wakePending = false;
let wake: ( () => void ) | null = null;

for ( const signal of [ "SIGINT", "SIGTERM" ] as const ) {
  process.on( signal, () => {
    stopping = true;
  } );
}

function requestWake(): void {
  wakePending = true;
  wake?.();
}

async function waitForWork(): Promise<void> {
  if ( wakePending || stopping ) return;
  await new Promise<void>( resolve => {
    const timeout = setTimeout( () => {
      wake = null;
      resolve();
    }, pollMs );
    wake = () => {
      clearTimeout( timeout );
      wake = null;
      resolve();
    };
  } );
}

async function main() {
  const { NotificationWorker } = await import( "@/lib/notifications/worker" );
  const worker = new NotificationWorker();
  let unsubscribe: ( () => Promise<void> ) | undefined;
  try {
    await worker.verify();
    try {
      unsubscribe = await getPocketBaseClient().collection( pocketBaseCollections.deliveries ).subscribe( "*", event => {
        const record = event.record as { status?: unknown; nextAttemptAt?: unknown; leaseExpiresAt?: unknown };
        const now = Date.now();
        const nextAttemptAt = Date.parse( String( record.nextAttemptAt || "" ) );
        const leaseExpiresAt = record.leaseExpiresAt ? Date.parse( String( record.leaseExpiresAt ) ) : 0;
        if ( record.status === "pending" && nextAttemptAt <= now && ( !leaseExpiresAt || leaseExpiresAt <= now ) ) requestWake();
      } );
    } catch ( error ) {
      console.warn( "Notification realtime wake-up unavailable; using polling:", error );
    }
    if ( readinessFile ) fs.writeFileSync( readinessFile, String( process.pid ) );
    console.log( "Notification worker configuration verified" );
    while ( !stopping ) {
      wakePending = false;
      let result;
      do {
        result = await worker.runOnce( batchSize, concurrency );
        if ( result.claimed > 0 ) console.log( "Notification worker cycle", result );
      } while ( !stopping && result.claimed === batchSize );
      await waitForWork();
    }
  } finally {
    await unsubscribe?.();
    if ( readinessFile ) fs.rmSync( readinessFile, { force: true } );
    await worker.close();
  }
}

main().catch( error => {
  console.error( "Notification worker stopped:", error );
  process.exitCode = 1;
} );
