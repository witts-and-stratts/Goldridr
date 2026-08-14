import fs from "fs";
import path from "path";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { purgeExpiredWebhookLogs } from "@/lib/notifications/webhook-logs";

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
const providerVerifyTimeoutMs = positiveInteger( process.env.NOTIFICATION_PROVIDER_VERIFY_TIMEOUT_MS, 10_000 );
const realtimeSubscribeTimeoutMs = positiveInteger( process.env.NOTIFICATION_REALTIME_SUBSCRIBE_TIMEOUT_MS, 10_000 );
const readinessFile = process.env.NOTIFICATION_READY_FILE;
let stopping = false;
let wakePending = false;
let wake: ( () => void ) | null = null;
let lastWebhookCleanupAt = 0;

type LogLevel = "info" | "warn" | "error";

function errorDetails( error: unknown ): Record<string, unknown> {
  if ( error instanceof Error ) {
    const code = ( error as Error & { code?: unknown } ).code;
    return { errorName: error.name, errorMessage: error.message, ...( typeof code === "string" ? { errorCode: code } : {} ) };
  }
  return { errorName: "Error", errorMessage: String( error ) };
}

function log( level: LogLevel, event: string, details: Record<string, unknown> = {} ): void {
  const entry = JSON.stringify( {
    timestamp: new Date().toISOString(), level, event, service: "notification-worker", pid: process.pid, ...details,
  } );
  if ( level === "error" ) console.error( entry );
  else if ( level === "warn" ) console.warn( entry );
  else console.log( entry );
}

async function withTimeout( operation: Promise<void>, timeoutMs: number, name: string ): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race( [
      operation,
      new Promise<never>( ( _resolve, reject ) => {
        timeout = setTimeout( () => reject( new Error( `${ name } verification timed out after ${ timeoutMs }ms` ) ), timeoutMs );
      } ),
    ] );
  } finally {
    if ( timeout ) clearTimeout( timeout );
  }
}

function verifyInBackground( name: string, operation: () => Promise<void> ): void {
  log( "info", "worker.provider_verification_started", { provider: name, timeoutMs: providerVerifyTimeoutMs } );
  void withTimeout( operation(), providerVerifyTimeoutMs, name )
    .then( () => log( "info", "worker.provider_verification_succeeded", { provider: name } ) )
    .catch( error => log( "warn", "worker.provider_verification_failed", { provider: name, ...errorDetails( error ) } ) );
}

for ( const signal of [ "SIGINT", "SIGTERM" ] as const ) {
  process.on( signal, () => {
    log( "info", "worker.shutdown_requested", { signal } );
    stopping = true;
    requestWake();
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
  const { createInboundEmailReceiver } = await import( "@/lib/notifications/inbound-email-receiver" );
  const worker = new NotificationWorker( undefined, event => {
    log( event.event === "notification.delivery.failed" ? "error" : event.event === "notification.delivery.retry_scheduled" ? "warn" : "info", event.event, event );
  } );
  const inboundEmail = createInboundEmailReceiver();
  let unsubscribe: ( () => Promise<void> ) | undefined;
  try {
    log( "info", "worker.starting", { pollMs, batchSize, concurrency, realtimeWakeUpEnabled: true, inboundEmailEnabled: true } );
    if ( readinessFile ) fs.writeFileSync( readinessFile, String( process.pid ) );
    log( "info", "worker.ready", { readinessFile: readinessFile || null } );
    void withTimeout(
      Promise.resolve().then( async () => {
        const stopSubscription = await getPocketBaseClient().collection( pocketBaseCollections.deliveries ).subscribe( "*", event => {
          const record = event.record as { status?: unknown; nextAttemptAt?: unknown; leaseExpiresAt?: unknown };
          const now = Date.now();
          const nextAttemptAt = Date.parse( String( record.nextAttemptAt || "" ) );
          const leaseExpiresAt = record.leaseExpiresAt ? Date.parse( String( record.leaseExpiresAt ) ) : 0;
          if ( record.status === "pending" && nextAttemptAt <= now && ( !leaseExpiresAt || leaseExpiresAt <= now ) ) {
            log( "info", "worker.wake_requested", { source: "delivery_realtime" } );
            requestWake();
          }
        } );
        if ( stopping ) await stopSubscription();
        else {
          unsubscribe = stopSubscription;
          log( "info", "worker.realtime_subscribed", { collection: pocketBaseCollections.deliveries } );
        }
      } ),
      realtimeSubscribeTimeoutMs,
      "PocketBase realtime subscription"
    ).catch( error => {
      log( "warn", "worker.realtime_subscription_failed", { fallback: "polling", ...errorDetails( error ) } );
    } );
    verifyInBackground( "email", () => worker.verifyEmail() );
    verifyInBackground( "sms", () => worker.verifySms() );
    verifyInBackground( "inbound_email", () => inboundEmail.verify() );
    while ( !stopping ) {
      wakePending = false;
      if ( Date.now() - lastWebhookCleanupAt >= 3_600_000 ) {
        try {
          const deleted = await purgeExpiredWebhookLogs();
          lastWebhookCleanupAt = Date.now();
          if ( deleted > 0 ) log( "info", "webhook_logs.cleanup_completed", { deleted } );
        } catch ( error ) {
          lastWebhookCleanupAt = Date.now();
          log( "warn", "webhook_logs.cleanup_failed", errorDetails( error ) );
        }
      }
      let result;
      do {
        const startedAt = Date.now();
        result = await worker.runOnce( batchSize, concurrency );
        if ( result.claimed > 0 || result.failed > 0 ) {
          log( result.failed > 0 ? "warn" : "info", "worker.delivery_cycle_completed", { ...result, durationMs: Date.now() - startedAt } );
        }
      } while ( !stopping && result.claimed === batchSize );
      const inboundStartedAt = Date.now();
      try {
        const received = await inboundEmail.poll();
        if ( received > 0 ) log( "info", "worker.inbound_email_cycle_completed", { received, durationMs: Date.now() - inboundStartedAt } );
      } catch ( error ) {
        log( "warn", "worker.inbound_email_cycle_failed", { durationMs: Date.now() - inboundStartedAt, ...errorDetails( error ) } );
      }
      await waitForWork();
    }
  } finally {
    log( "info", "worker.stopping" );
    await unsubscribe?.();
    if ( readinessFile ) fs.rmSync( readinessFile, { force: true } );
    await worker.close();
    log( "info", "worker.stopped" );
  }
}

main().catch( error => {
  log( "error", "worker.fatal", errorDetails( error ) );
  process.exitCode = 1;
} );
