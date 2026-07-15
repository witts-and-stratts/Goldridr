import { NextResponse } from "next/server";
import { getAppSession, unauthorizedResponse } from "@/lib/driver-auth";
import { deletePushToken, savePushToken } from "@/lib/notifications/push";

function readToken( body: Record<string, unknown> ): string {
  const token = typeof body.token === "string" ? body.token.trim() : "";
  return token.startsWith( "ExponentPushToken[" ) || token.startsWith( "ExpoPushToken[" )
    ? token
    : "";
}

export async function POST( req: Request ) {
  try {
    const session = await getAppSession( req );
    if ( !session ) return unauthorizedResponse();

    const body = await req.json();
    const token = readToken( body );
    if ( !token ) {
      return NextResponse.json( { success: false, error: "Invalid push token" }, { status: 400 } );
    }
    const platform = typeof body.platform === "string" ? body.platform : "unknown";
    await savePushToken( undefined, session.userId, token, platform );
    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to register push token";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = await getAppSession( req );
    if ( !session ) return unauthorizedResponse();

    const body = await req.json();
    const token = readToken( body );
    if ( !token ) {
      return NextResponse.json( { success: false, error: "Invalid push token" }, { status: 400 } );
    }
    await deletePushToken( undefined, token, session.userId );
    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to remove push token";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
