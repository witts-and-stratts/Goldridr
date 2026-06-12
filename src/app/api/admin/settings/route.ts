import { NextResponse } from "next/server";
import z from "zod/v4";
import { getSession } from "@/lib/auth";
import { getAdminSettings, saveAdminSettings } from "@/lib/admin-settings";

const SettingsSchema = z.object( {
  bookingBufferMinutes: z.number().int().min( 0 ).max( 240 ),
  notificationTimezone: z.string().trim().min( 1 ),
  appUrl: z.string().trim().min( 1 ).refine( value => {
    try {
      new URL( value );
      return true;
    } catch {
      return false;
    }
  }, "A valid app URL is required" ),
  emailFromName: z.string().trim().min( 1 ),
  emailFromAddress: z.email( "A valid from address is required" ),
  emailReplyTo: z.string().trim().optional().default( "" ).refine(
    value => value === "" || z.email().safeParse( value ).success,
    "A valid reply-to address is required"
  ),
  priceByMileAirport: z.number().min( 0 ).max( 100 ),
  priceByMileCity: z.number().min( 0 ).max( 100 ),
  priceByMileHourly: z.number().min( 0 ).max( 100 ),
  twilioFromNumber: z.string().trim().min( 1 ),
} );

export async function GET() {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  return NextResponse.json( {
    success: true,
    settings: getAdminSettings(),
  } );
}

export async function PUT( request: Request ) {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );

  const body = await request.json();
  const parsed = SettingsSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) },
      { status: 400 }
    );
  }

  saveAdminSettings( parsed.data );
  return NextResponse.json( {
    success: true,
    settings: parsed.data,
  } );
}
