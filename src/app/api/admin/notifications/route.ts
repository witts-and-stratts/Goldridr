import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  getUnreadCount,
  listFailedDeliveries,
  listNotifications,
  markNotificationsRead,
  retryDelivery,
} from "@/lib/notifications/store";

export async function GET( request: Request ) {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const url = new URL( request.url );
  const notifications = listNotifications( getDb(), session.userId, {
    unreadOnly: url.searchParams.get( "unread" ) === "true",
    category: url.searchParams.get( "category" ) || undefined,
    limit: Number( url.searchParams.get( "limit" ) || 50 ),
    afterId: Number( url.searchParams.get( "after" ) || 0 ) || undefined,
  } );
  return NextResponse.json( {
    success: true,
    notifications,
    unreadCount: getUnreadCount( getDb(), session.userId ),
    failedDeliveries: isAdmin( session ) ? listFailedDeliveries( getDb() ) : [],
  } );
}

export async function PATCH( request: Request ) {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const body = await request.json();
  if ( body.action === "read" ) {
    const ids = Array.isArray( body.recipientIds ) ? body.recipientIds.map( Number ).filter( Number.isInteger ) : undefined;
    const updated = markNotificationsRead( getDb(), session.userId, ids );
    return NextResponse.json( { success: true, updated } );
  }
  if ( body.action === "retry" ) {
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    const updated = retryDelivery( getDb(), Number( body.deliveryId ) );
    return NextResponse.json( { success: updated }, { status: updated ? 200 : 404 } );
  }
  return NextResponse.json( { success: false, error: "Unsupported action" }, { status: 400 } );
}
