import { getDb } from "@/lib/db";
import { connection } from "next/server";
import { getPocketBaseServerClient } from "@/lib/pocketbase/server";
import {
  isPocketBaseAuthEnabled,
  isPocketBaseConfigured,
  isPocketBaseCoreWriteEnabled,
  isPocketBaseDeliveryQueueEnabled,
  isPocketBaseNotificationReadEnabled,
  isPocketBaseNotificationWriteEnabled,
} from "@/lib/pocketbase/config";

export async function GET() {
  await connection();
  const checks: Record<string, { ok: boolean; message?: string }> = {};
  try {
    await ( await getDb() ).prepare( "SELECT 1" ).get();
    checks.sqlite = { ok: true };
  } catch ( error ) {
    checks.sqlite = { ok: false, message: error instanceof Error ? error.message : "Database check failed" };
  }

  const pocketBaseRequired = isPocketBaseAuthEnabled()
    || isPocketBaseCoreWriteEnabled()
    || isPocketBaseDeliveryQueueEnabled()
    || isPocketBaseNotificationReadEnabled()
    || isPocketBaseNotificationWriteEnabled();
  if ( isPocketBaseConfigured() ) {
    try {
      await getPocketBaseServerClient().health.check();
      checks.pocketBase = { ok: true };
    } catch ( error ) {
      checks.pocketBase = { ok: false, message: error instanceof Error ? error.message : "PocketBase check failed" };
    }
  } else {
    checks.pocketBase = pocketBaseRequired
      ? { ok: false, message: "PocketBase is required but not configured" }
      : { ok: true, message: "PocketBase migration flags are disabled" };
  }

  const ok = Object.values( checks ).every( check => check.ok );
  return Response.json( { ok, checks }, { status: ok ? 200 : 503 } );
}
