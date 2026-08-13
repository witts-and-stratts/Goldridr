import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = ( name: string ) => new URL( `../${ name }`, import.meta.url );

test( "the Docker build embeds only the public VAPID key", async () => {
  const dockerfile = await readFile( projectFile( "Dockerfile" ), "utf8" );

  assert.match( dockerfile, /ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY/ );
  assert.match( dockerfile, /ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=\$NEXT_PUBLIC_VAPID_PUBLIC_KEY/ );
  assert.doesNotMatch( dockerfile, /ARG VAPID_PRIVATE_KEY/ );
  assert.doesNotMatch( dockerfile, /ENV VAPID_PRIVATE_KEY=/ );
} );

test( "the image workflow supplies the public VAPID build argument", async () => {
  const workflow = await readFile( projectFile( ".github/workflows/deploy.yml" ), "utf8" );

  assert.match(
    workflow,
    /NEXT_PUBLIC_VAPID_PUBLIC_KEY=\$\{\{ vars\.NEXT_PUBLIC_VAPID_PUBLIC_KEY \}\}/,
  );
  assert.doesNotMatch( workflow, /VAPID_PRIVATE_KEY=\$\{\{/ );
} );

test( "production injects and validates Web Push runtime configuration", async () => {
  const compose = await readFile( projectFile( "compose.production.yaml" ), "utf8" );
  const deploy = await readFile( projectFile( "scripts/deploy.sh" ), "utf8" );

  assert.equal( ( compose.match( /^\s+NEXT_PUBLIC_VAPID_PUBLIC_KEY:/gm ) || [] ).length, 2 );
  assert.equal( ( compose.match( /^\s+VAPID_PRIVATE_KEY:/gm ) || [] ).length, 2 );
  assert.equal( ( compose.match( /^\s+VAPID_SUBJECT:/gm ) || [] ).length, 2 );
  assert.match( deploy, /NEXT_PUBLIC_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT/ );
} );

test( "notification worker readiness does not depend on external providers", async () => {
  const startup = await readFile( projectFile( "scripts/notification-worker.ts" ), "utf8" );
  const worker = await readFile( projectFile( "src/lib/notifications/worker.ts" ), "utf8" );
  const readyIndex = startup.indexOf( 'log( "info", "worker.ready"' );

  assert.ok( readyIndex > 0 );
  assert.ok( startup.indexOf( 'verifyInBackground( "email"', readyIndex ) > readyIndex );
  assert.ok( startup.indexOf( 'verifyInBackground( "sms"', readyIndex ) > readyIndex );
  assert.ok( startup.indexOf( 'verifyInBackground( "inbound_email"', readyIndex ) > readyIndex );
  assert.doesNotMatch( startup, /await worker\.verify\(\)/ );
  assert.doesNotMatch( startup, /await inboundEmail\.verify\(\)/ );
  assert.match( worker, /if \( delivery\.channel === "email" \) \{\s+if \( !this\.emailTransport \)/ );
  assert.doesNotMatch( worker, /async runOnce[\s\S]*?await this\.verify\(\)/ );
} );
