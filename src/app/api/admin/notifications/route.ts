import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import {
  deleteNotifications,
  getUnreadCount,
  listNotifications,
  markNotificationsRead,
  markNotificationsUnread,
} from "@/lib/notifications/inbox-store";
import { deletePocketBaseFailedDelivery, listPocketBaseFailedDeliveries, retryPocketBaseDelivery } from "@/lib/pocketbase/notifications";
import { getConfiguredSmsTransport } from "@/lib/notifications/config";
import { listPocketBaseMockSmsMessages } from "@/lib/pocketbase/operations";

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const url = new URL( request.url );
  const notifications = await listNotifications( undefined, session.userId, {
    unreadOnly: url.searchParams.get( "unread" ) === "true",
    category: url.searchParams.get( "category" ) || undefined,
    limit: Number( url.searchParams.get( "limit" ) || 50 ),
    afterId: Number( url.searchParams.get( "after" ) || 0 ) || undefined,
  } );
  const mockSmsEnabled = isAdmin( session ) && getConfiguredSmsTransport() === "mock";
  const mockSmsMessages = mockSmsEnabled
    ? ( await listPocketBaseMockSmsMessages( 100 ).catch( () => [] ) ).map( message => ( {
      sid: message.sid,
      from: message.fromNumber,
      to: message.toNumber,
      body: message.body,
      status: message.status,
      errorMessage: message.errorMessage,
      dateCreated: message.createdAt,
      dateUpdated: message.updatedAt,
    } ) )
    : [];
  return NextResponse.json( {
    success: true,
    notifications,
    unreadCount: await getUnreadCount( undefined, session.userId ),
    failedDeliveries: isAdmin( session ) ? await listPocketBaseFailedDeliveries() : [],
    mockSmsEnabled,
    mockSmsMessages,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } } );
}

export async function PATCH( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const body = await request.json();
  if ( body.action === "read" ) {
    const ids = Array.isArray( body.recipientIds ) ? body.recipientIds.map( Number ).filter( Number.isInteger ) : undefined;
    const updated = await markNotificationsRead( undefined, session.userId, ids );
    return NextResponse.json( { success: true, updated } );
  }
  if ( body.action === "unread" ) {
    const ids = Array.isArray( body.recipientIds ) ? body.recipientIds.map( Number ).filter( Number.isInteger ) : undefined;
    const updated = await markNotificationsUnread( undefined, session.userId, ids );
    return NextResponse.json( { success: true, updated } );
  }
  if ( body.action === "delete" ) {
    const ids = Array.isArray( body.recipientIds ) ? body.recipientIds.map( Number ).filter( Number.isInteger ) : undefined;
    const deleted = await deleteNotifications( undefined, session.userId, ids );
    return NextResponse.json( { success: true, deleted } );
  }
  if ( body.action === "retry" ) {
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    const updated = await retryPocketBaseDelivery( Number( body.deliveryId ) );
    return NextResponse.json( { success: updated }, { status: updated ? 200 : 404 } );
  }
  if ( body.action === "delete_failure" ) {
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    const deliveryId = Number( body.deliveryId );
    if ( !Number.isInteger( deliveryId ) ) return NextResponse.json( { success: false, error: "Invalid delivery ID" }, { status: 400 } );
    const deleted = await deletePocketBaseFailedDelivery( deliveryId );
    return NextResponse.json( { success: deleted }, { status: deleted ? 200 : 404 } );
  }
  return NextResponse.json( { success: false, error: "Unsupported action" }, { status: 400 } );
}
