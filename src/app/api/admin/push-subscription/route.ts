import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdmin } from "@/lib/auth";
import {
  deleteWebPushSubscription,
  getWebPushConfiguration,
  isWebPushConfigured,
  saveWebPushSubscription,
  sendTestWebPush,
} from "@/lib/notifications/web-push";
import { webPushSubscriptionSchema } from "@/lib/notifications/web-push-shared";

const endpointSchema = z.object( {
  endpoint: z.string().url().max( 4096 ).refine( value => value.startsWith( "https://" ), "Push endpoint must use HTTPS" ),
} );

async function requireAdmin() {
  const session = await getSession();
  return isAdmin( session ) ? session : null;
}

function unavailable() {
  return NextResponse.json( { success: false, error: "Native notifications are not configured" }, { status: 503 } );
}

export async function GET() {
  const session = await requireAdmin();
  if ( !session ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  const configuration = getWebPushConfiguration();
  return NextResponse.json( {
    success: true,
    configured: configuration.configured,
    publicKey: configuration.configured ? configuration.publicKey : "",
    missing: configuration.missing,
  } );
}

export async function PUT( request: Request ) {
  const session = await requireAdmin();
  if ( !session ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  if ( !isWebPushConfigured() ) return unavailable();

  const parsed = webPushSubscriptionSchema.safeParse( await request.json().catch( () => null ) );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Invalid push subscription" }, { status: 400 } );
  }
  const id = await saveWebPushSubscription( "admin", parsed.data, request.headers.get( "user-agent" ) || "" );
  return NextResponse.json( { success: true, id } );
}

export async function DELETE( request: Request ) {
  const session = await requireAdmin();
  if ( !session ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const parsed = endpointSchema.safeParse( await request.json().catch( () => null ) );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Invalid push endpoint" }, { status: 400 } );
  }
  const deleted = await deleteWebPushSubscription( "admin", parsed.data.endpoint );
  return NextResponse.json( { success: true, deleted } );
}

export async function POST( request: Request ) {
  const session = await requireAdmin();
  if ( !session ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  if ( !isWebPushConfigured() ) return unavailable();

  const parsed = endpointSchema.safeParse( await request.json().catch( () => null ) );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Invalid push endpoint" }, { status: 400 } );
  }
  try {
    await sendTestWebPush( "admin", parsed.data.endpoint );
    return NextResponse.json( { success: true } );
  } catch {
    return NextResponse.json( { success: false, error: "Unable to send the test notification" }, { status: 502 } );
  }
}
