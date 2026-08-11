import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { linkInboundSmsToBooking } from "@/lib/notifications/inbound-sms";

export async function PATCH( request: Request, context: RouteContext<"/api/admin/inbound-sms/[id]"> ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  const { id } = await context.params;
  const notificationId = Number( id );
  if ( !Number.isSafeInteger( notificationId ) || notificationId <= 0 ) {
    return NextResponse.json( { success: false, error: "Invalid notification ID" }, { status: 400 } );
  }
  const body = await request.json().catch( () => null ) as { bookingReference?: unknown } | null;
  const bookingReference = typeof body?.bookingReference === "string" ? body.bookingReference.trim() : "";
  if ( !bookingReference ) return NextResponse.json( { success: false, error: "Booking reference is required" }, { status: 400 } );
  try {
    const linked = await linkInboundSmsToBooking( notificationId, bookingReference, session );
    return NextResponse.json( { success: linked }, { status: linked ? 200 : 404 } );
  } catch ( error ) {
    const message = error instanceof Error ? error.message : "Unable to link message";
    return NextResponse.json( { success: false, error: message }, { status: message === "Booking not found" ? 404 : 500 } );
  }
}
