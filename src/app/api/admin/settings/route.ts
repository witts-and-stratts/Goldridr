import { NextResponse } from "next/server";
import z from "zod/v4";
import { getAdminSettings, saveAdminSettings } from "@/lib/admin-settings";
import { getRequestSession } from "@/lib/driver-auth";

const ProviderCredentialsSchema = z.object( {
  STRIPE_SECRET_KEY: z.string().trim().max( 5000 ).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().max( 5000 ).optional(),
  SQUARE_ACCESS_TOKEN: z.string().trim().max( 5000 ).optional(),
  SQUARE_APP_ID: z.string().trim().max( 5000 ).optional(),
  SQUARE_LOCATION_ID: z.string().trim().max( 5000 ).optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().trim().max( 5000 ).optional(),
  PAYPAL_CLIENT_ID: z.string().trim().max( 5000 ).optional(),
  PAYPAL_CLIENT_SECRET: z.string().trim().max( 5000 ).optional(),
  PAYPAL_WEBHOOK_ID: z.string().trim().max( 5000 ).optional(),
} ).optional().default( {} );

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
  activeProcessor: z.enum( [ "stripe", "square" ] ),
  enabledProcessors: z.array( z.enum( [ "stripe", "square", "paypal", "zelle" ] ) ).min( 1 ),
  enabledMethods: z.array( z.enum( [ "card", "apple_pay", "cash_app", "venmo", "zelle" ] ) ).min( 1 ),
  zelleRecipient: z.string().trim().max( 200 ),
  zelleInstructions: z.string().trim().max( 2000 ),
  holdMinutes: z.number().int().min( 30 ).max( 1440 ),
  zelleVerificationHours: z.number().int().min( 1 ).max( 168 ),
  hourlyRate: z.number().min( 0 ).max( 10000 ),
  squareEnvironment: z.enum( [ "sandbox", "production" ] ),
  paypalEnvironment: z.enum( [ "sandbox", "production" ] ),
  providerCredentials: ProviderCredentialsSchema,
} ).superRefine( ( settings, context ) => {
  const hasOnlineProcessor = settings.enabledProcessors.includes( "stripe" ) || settings.enabledProcessors.includes( "square" );
  const hasAvailableMethod = settings.enabledMethods.some( method => {
    if ( method === "venmo" ) return settings.enabledProcessors.includes( "paypal" );
    if ( method === "zelle" ) return settings.enabledProcessors.includes( "zelle" );
    return hasOnlineProcessor;
  } );
  if ( !hasAvailableMethod ) context.addIssue( {
    code: "custom",
    path: [ "enabledMethods" ],
    message: "Select at least one payment method supported by an enabled booking processor",
  } );
  if ( hasOnlineProcessor && !settings.enabledProcessors.includes( settings.activeProcessor ) ) context.addIssue( {
    code: "custom",
    path: [ "activeProcessor" ],
    message: "The active card processor must be enabled",
  } );
} );

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session || session.role !== "admin" ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  return NextResponse.json( {
    success: true,
    settings: await getAdminSettings(),
  } );
}

export async function PUT( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session || session.role !== "admin" ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const body = await request.json().catch( () => null );
  const parsed = SettingsSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) },
      { status: 400 }
    );
  }

  try {
    await saveAdminSettings( parsed.data );
    return NextResponse.json( {
      success: true,
      settings: await getAdminSettings(),
    } );
  } catch ( error ) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : undefined;
    const message = error instanceof Error ? error.message : "Unknown settings error";
    console.error( "admin.settings.save_failed", { errorName: error instanceof Error ? error.name : "Error", status, message } );

    if ( message.includes( "PAYMENT_SETTINGS_ENCRYPTION_KEY" ) || message.includes( "Stored payment credential is invalid" ) ) {
      return NextResponse.json( {
        success: false,
        error: message.includes( "Stored payment credential" )
          ? "A saved payment credential cannot be decrypted. Restore the original PAYMENT_SETTINGS_ENCRYPTION_KEY before replacing it."
          : "Payment credential encryption is not configured. Set PAYMENT_SETTINGS_ENCRYPTION_KEY on the web service.",
      }, { status: 503 } );
    }

    if ( status ) return NextResponse.json( {
      success: false,
      error: "PocketBase rejected the settings update. Verify the app_settings migration and web-service PocketBase credentials.",
    }, { status: 502 } );

    return NextResponse.json( {
      success: false,
      error: "Settings could not be saved. Check the web-service logs for admin.settings.save_failed.",
    }, { status: 500 } );
  }
}
