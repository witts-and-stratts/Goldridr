import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listNotifications } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

export async function GET( request: Request ) {
  const session = await getSession();
  if ( !session ) return new Response( "Unauthenticated", { status: 401 } );

  const url = new URL( request.url );
  const headerId = Number( request.headers.get( "last-event-id" ) || 0 );
  let cursor = Number( url.searchParams.get( "after" ) || headerId || 0 );
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream( {
    start( controller ) {
      const encoder = new TextEncoder();
      const write = ( value: string ) => controller.enqueue( encoder.encode( value ) );
      const poll = () => {
        const events = listNotifications( getDb(), session.userId, { afterId: cursor, limit: 100 } ).reverse();
        for ( const event of events ) {
          cursor = Math.max( cursor, event.recipientId );
          write( `id: ${ event.recipientId }\nevent: notification\ndata: ${ JSON.stringify( event ) }\n\n` );
        }
      };
      poll();
      write( ": connected\n\n" );
      timer = setInterval( () => {
        try {
          poll();
          write( ": keepalive\n\n" );
        } catch {
          if ( timer ) clearInterval( timer );
          controller.close();
        }
      }, 3000 );
      request.signal.addEventListener( "abort", () => {
        if ( timer ) clearInterval( timer );
        try { controller.close(); } catch {}
      } );
    },
    cancel() {
      if ( timer ) clearInterval( timer );
    },
  } );

  return new Response( stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  } );
}
