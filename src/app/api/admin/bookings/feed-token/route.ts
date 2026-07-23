import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/driver-auth";
import {
  createPocketBaseCalendarFeedToken,
  hasActivePocketBaseCalendarFeedToken,
  revokePocketBaseCalendarFeedTokens,
} from "@/lib/pocketbase/operations";

async function getAdminSession( request: Request ) {
  const session = await getRequestSession( request );
  return session?.role === "admin" ? session : null;
}

function storageUnavailable( error: unknown ) {
  console.error( "Calendar feed token storage is unavailable:", error );
  return NextResponse.json(
    { success: false, error: "Calendar feed storage is unavailable. Deploy the PocketBase calendar_feed_tokens migration." },
    { status: 503 }
  );
}

export async function GET( request: Request ) {
  if ( !await getAdminSession( request ) ) {
    return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  }
  try {
    return NextResponse.json( { success: true, active: await hasActivePocketBaseCalendarFeedToken() } );
  } catch ( error ) {
    return storageUnavailable( error );
  }
}

export async function POST( request: Request ) {
  const session = await getAdminSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );

  try {
    const token = await createPocketBaseCalendarFeedToken( session.userId );
    return NextResponse.json( { success: true, token }, { status: 201 } );
  } catch ( error ) {
    return storageUnavailable( error );
  }
}

export async function DELETE( request: Request ) {
  if ( !await getAdminSession( request ) ) {
    return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  }
  try {
    await revokePocketBaseCalendarFeedTokens();
    return NextResponse.json( { success: true } );
  } catch ( error ) {
    return storageUnavailable( error );
  }
}
