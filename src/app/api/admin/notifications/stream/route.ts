import type { RecordModel } from "pocketbase";
import { getSession, isAdmin, type AuthSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications/inbox-store";
import { mapPocketBaseRecipient } from "@/lib/notifications/pocketbase-inbox";
import { isPocketBaseConfigured } from "@/lib/pocketbase/config";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { getPocketBaseServerClient } from "@/lib/pocketbase/server";

function response( stream: ReadableStream<Uint8Array> ) {
  return new Response( stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  } );
}

function pocketBaseStream( request: Request, session: AuthSession, cursor: number, includeDeliveries: boolean ) {
  const pb = getPocketBaseServerClient();
  let timer: ReturnType<typeof setInterval> | undefined;
  const unsubscribers: Array<() => Promise<void>> = [];
  let closed = false;

  const stream = new ReadableStream<Uint8Array>( {
    async start( controller ) {
      const encoder = new TextEncoder();
      const write = ( value: string ) => {
        if ( !closed ) controller.enqueue( encoder.encode( value ) );
      };
      const cleanup = async () => {
        if ( closed ) return;
        closed = true;
        if ( timer ) clearInterval( timer );
        await Promise.all( unsubscribers.map( unsubscribe => unsubscribe() ) );
      };
      request.signal.addEventListener( "abort", () => { void cleanup(); } );

      try {
        unsubscribers.push( await pb.collection( pocketBaseCollections.recipients ).subscribe(
          "*",
          event => {
            if ( event.action !== "create" ) return;
            try {
              const notification = mapPocketBaseRecipient( event.record as RecordModel );
              write( `id: ${ notification.recipientId }\nevent: notification\ndata: ${ JSON.stringify( notification ) }\n\n` );
              write( "event: inbox\ndata: {}\n\n" );
            } catch {}
          },
          {
            filter: pb.filter( "userId = {:userId}", { userId: session.userId } ),
            expand: "notification",
          }
        ) );

        if ( includeDeliveries && isAdmin( session ) ) {
          unsubscribers.push( await pb.collection( pocketBaseCollections.deliveries ).subscribe(
            "*",
            () => write( "event: inbox\ndata: {}\n\n" )
          ) );
        }

        const backlog = ( await listNotifications( undefined, session.userId, { afterId: cursor, limit: 100 } ) ).reverse();
        for ( const notification of backlog ) {
          write( `id: ${ notification.recipientId }\nevent: notification\ndata: ${ JSON.stringify( notification ) }\n\n` );
        }
        write( ": connected\n\n" );
        timer = setInterval( () => write( ": keepalive\n\n" ), 25_000 );
      } catch ( error ) {
        await cleanup();
        controller.error( error );
      }
    },
    async cancel() {
      closed = true;
      if ( timer ) clearInterval( timer );
      await Promise.all( unsubscribers.map( unsubscribe => unsubscribe() ) );
    },
  } );
  return response( stream );
}

export async function GET( request: Request ) {
  const session = await getSession();
  if ( !session ) return new Response( "Unauthenticated", { status: 401 } );

  const url = new URL( request.url );
  const headerId = Number( request.headers.get( "last-event-id" ) || 0 );
  const cursor = Number( url.searchParams.get( "after" ) || headerId || 0 );
  if ( !isPocketBaseConfigured() ) return new Response( "PocketBase is not configured", { status: 503 } );
  return pocketBaseStream( request, session, cursor, url.searchParams.get( "deliveries" ) === "true" );
}
