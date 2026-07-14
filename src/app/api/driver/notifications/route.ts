import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAppSession, unauthorizedResponse } from "@/lib/driver-auth";
import {
  deleteNotifications,
  getUnreadCount,
  listNotifications,
  markNotificationsRead,
} from "@/lib/notifications/inbox-store";

export async function GET( req: Request ) {
  try {
    const session = await getAppSession( req );
    if ( !session ) return unauthorizedResponse();

    const url = new URL( req.url );
    const notifications = await listNotifications( await getDb(), session.userId, {
      unreadOnly: url.searchParams.get( "unread" ) === "true",
      category: url.searchParams.get( "category" ) || undefined,
      limit: Number( url.searchParams.get( "limit" ) || 50 ),
      afterId: Number( url.searchParams.get( "after" ) || 0 ) || undefined,
    } );
    return NextResponse.json( {
      success: true,
      notifications,
      unreadCount: await getUnreadCount( await getDb(), session.userId ),
    } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function PATCH( req: Request ) {
  try {
    const session = await getAppSession( req );
    if ( !session ) return unauthorizedResponse();

    const body = await req.json();
    if ( body.action === "read" ) {
      const ids = Array.isArray( body.recipientIds )
        ? body.recipientIds.map( Number ).filter( Number.isInteger )
        : undefined;
      const updated = await markNotificationsRead( await getDb(), session.userId, ids );
      return NextResponse.json( { success: true, updated } );
    }
    if ( body.action === "delete" ) {
      const ids = Array.isArray( body.recipientIds )
        ? body.recipientIds.map( Number ).filter( Number.isInteger )
        : undefined;
      const deleted = await deleteNotifications( await getDb(), session.userId, ids );
      return NextResponse.json( { success: true, deleted } );
    }
    return NextResponse.json( { success: false, error: "Unsupported action" }, { status: 400 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to update notifications";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
