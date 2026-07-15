import { connection } from "next/server";
import { getPocketBaseServerClient } from "@/lib/pocketbase/server";
import { isPocketBaseConfigured } from "@/lib/pocketbase/config";

export async function GET() {
  await connection();
  const checks: Record<string, { ok: boolean; message?: string }> = {};
  if ( isPocketBaseConfigured() ) {
    try {
      await getPocketBaseServerClient().health.check();
      checks.pocketBase = { ok: true };
    } catch ( error ) {
      checks.pocketBase = { ok: false, message: error instanceof Error ? error.message : "PocketBase check failed" };
    }
  } else {
    checks.pocketBase = { ok: false, message: "PocketBase is not configured" };
  }

  const ok = Object.values( checks ).every( check => check.ok );
  return Response.json( { ok, checks }, { status: ok ? 200 : 503 } );
}
