import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { listTemplateViews } from "@/lib/notifications/template-store";

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  return NextResponse.json( { success: true, templates: await listTemplateViews() } );
}
