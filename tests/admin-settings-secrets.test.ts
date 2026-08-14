import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = ( name: string ) => new URL( `../${ name }`, import.meta.url );

test( "saved payment credentials are masked and revealed only on demand", async () => {
  const page = await readFile( projectFile( "src/app/admin/settings/page.tsx" ), "utf8" );

  assert.match( page, /configured \? '\*\*\*\*\*\*\*\*\*\*\*\*'/ );
  assert.match( page, /\/api\/admin\/settings\/credential\?key=/ );
  assert.match( page, /aria-label=\{revealed \? `Hide \$\{label\}` : `Show \$\{label\}`\}/ );
  assert.match( page, /cache: 'no-store'/ );
} );

test( "credential reveal is admin-only, allowlisted, and never cached", async () => {
  const route = await readFile( projectFile( "src/app/api/admin/settings/credential/route.ts" ), "utf8" );
  const settingsRoute = await readFile( projectFile( "src/app/api/admin/settings/route.ts" ), "utf8" );

  assert.match( route, /session\.role !== "admin"/ );
  assert.match( route, /z\.enum\( PAYMENT_CREDENTIAL_KEYS \)/ );
  assert.match( route, /private, no-store, max-age=0/ );
  assert.match( route, /admin\.settings\.credential_revealed/ );
  assert.match( settingsRoute, /session\.role !== "admin"/ );
} );
