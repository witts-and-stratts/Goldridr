import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getWebhookLog } from "@/lib/notifications/webhook-logs";

export async function GET( request: Request, context: RouteContext<"/api/admin/webhook-logs/[id]"> ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  try {
    const { id } = await context.params;
    const log = await getWebhookLog( id );
    return NextResponse.json( { success: true, log }, { headers: { "Cache-Control": "no-store, max-age=0" } } );
  } catch ( error ) {
    const status = typeof error === "object" && error && "status" in error && error.status === 404 ? 404 : 500;
    return NextResponse.json( { success: false, error: status === 404 ? "Log entry not found" : "Unable to load log entry" }, { status } );
  }
}
