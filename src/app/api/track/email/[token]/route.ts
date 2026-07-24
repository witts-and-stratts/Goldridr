import { recordEmailOpen, trackedDeliveryId } from "@/lib/notifications/email-open-tracking";

const PIXEL = Buffer.from( "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64" );

export async function GET( _request: Request, { params }: RouteContext<"/api/track/email/[token]"> ) {
  const { token } = await params;
  const deliveryId = trackedDeliveryId( token );
  if ( deliveryId ) await recordEmailOpen( deliveryId );
  return new Response( PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "private, no-store, max-age=0",
    },
  } );
}
