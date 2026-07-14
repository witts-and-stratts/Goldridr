import fs from "fs";
import path from "path";

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

const pollMs = Number( process.env.NOTIFICATION_POLL_MS || 5000 );
const readinessFile = process.env.NOTIFICATION_READY_FILE;
let stopping = false;

for ( const signal of [ "SIGINT", "SIGTERM" ] as const ) {
  process.on( signal, () => {
    stopping = true;
  } );
}

async function main() {
  const { NotificationWorker } = await import( "@/lib/notifications/worker" );
  const worker = new NotificationWorker();
  try {
    await worker.verify();
    if ( readinessFile ) fs.writeFileSync( readinessFile, String( process.pid ) );
    console.log( "Notification worker configuration verified" );
    while ( !stopping ) {
      const result = await worker.runOnce();
      if ( result.claimed > 0 ) console.log( "Notification worker cycle", result );
      await new Promise( resolve => setTimeout( resolve, pollMs ) );
    }
  } finally {
    if ( readinessFile ) fs.rmSync( readinessFile, { force: true } );
    await worker.close();
  }
}

main().catch( error => {
  console.error( "Notification worker stopped:", error );
  process.exitCode = 1;
} );
