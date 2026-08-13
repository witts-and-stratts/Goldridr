import assert from "node:assert/strict";
import test from "node:test";
import { resolveSettingValue } from "../src/lib/settings-resolution";

test( "settings prefer PocketBase, then environment, then default", () => {
  assert.equal( resolveSettingValue( "database", "environment", "default" ), "database" );
  assert.equal( resolveSettingValue( "", "environment", "default" ), "environment" );
  assert.equal( resolveSettingValue( undefined, "", "default" ), "default" );
} );
