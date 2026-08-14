import { NextResponse } from "next/server";
import z from "zod/v4";
import { getPaymentCredential, PAYMENT_CREDENTIAL_KEYS } from "@/lib/admin-settings";
import { getRequestSession } from "@/lib/driver-auth";

const CredentialKeySchema = z.enum( PAYMENT_CREDENTIAL_KEYS );
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie, Authorization",
};

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session || session.role !== "admin" ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403, headers: PRIVATE_HEADERS } );
  }

  const parsed = CredentialKeySchema.safeParse( new URL( request.url ).searchParams.get( "key" ) );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Unknown payment credential" }, { status: 400, headers: PRIVATE_HEADERS } );
  }

  try {
    const value = await getPaymentCredential( parsed.data );
    if ( !value ) {
      return NextResponse.json( { success: false, error: "This credential is not configured" }, { status: 404, headers: PRIVATE_HEADERS } );
    }
    console.info( "admin.settings.credential_revealed", { key: parsed.data, userId: session.userId } );
    return NextResponse.json( { success: true, value }, { headers: PRIVATE_HEADERS } );
  } catch {
    return NextResponse.json( { success: false, error: "This credential could not be decrypted" }, { status: 500, headers: PRIVATE_HEADERS } );
  }
}
