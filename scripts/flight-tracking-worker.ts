import fs from "fs";
import path from "path";

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

const parsedPollMs = Number( process.env.FLIGHT_TRACKING_POLL_MS );
const pollMs = Number.isSafeInteger( parsedPollMs ) && parsedPollMs >= 5_000 ? parsedPollMs : 30_000;
const readinessFile = process.env.FLIGHT_TRACKING_READY_FILE;
let stopping = false;

function log( level: "info" | "warn" | "error", event: string, details: Record<string, unknown> = {} ): void {
  const message = JSON.stringify( { timestamp: new Date().toISOString(), level, event, service: "flight-tracking-worker", pid: process.pid, ...details } );
  if ( level === "error" ) console.error( message );
  else if ( level === "warn" ) console.warn( message );
  else console.log( message );
}

for ( const signal of [ "SIGINT", "SIGTERM" ] as const ) {
  process.on( signal, () => {
    stopping = true;
    log( "info", "worker.shutdown_requested", { signal } );
  } );
}

async function wait(): Promise<void> {
  await new Promise<void>( resolve => setTimeout( resolve, pollMs ) );
}

async function main(): Promise<void> {
  const { FlightTrackingWorker } = await import( "@/lib/flights/tracking" );
  const { getPrimaryFlightProvider } = await import( "@/lib/flights/providers" );
  const worker = new FlightTrackingWorker();
  await worker.verify();
  if ( readinessFile ) fs.writeFileSync( readinessFile, String( process.pid ) );
  log( "info", "worker.ready", { pollMs, automaticProviderEnabled: Boolean( getPrimaryFlightProvider() ) } );
  try {
    while ( !stopping ) {
      const startedAt = Date.now();
      try {
        const result = await worker.runOnce();
        if ( result.checked || result.alerted || result.failed ) log( result.failed ? "warn" : "info", "worker.cycle_completed", { ...result, durationMs: Date.now() - startedAt } );
      } catch ( error ) {
        log( "error", "worker.cycle_failed", { error: error instanceof Error ? error.message : String( error ) } );
      }
      if ( !stopping ) await wait();
    }
  } finally {
    if ( readinessFile ) fs.rmSync( readinessFile, { force: true } );
    log( "info", "worker.stopped" );
  }
}

main().catch( error => {
  log( "error", "worker.fatal", { error: error instanceof Error ? error.message : String( error ) } );
  process.exitCode = 1;
} );
