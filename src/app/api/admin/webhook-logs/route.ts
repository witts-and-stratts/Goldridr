import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import {
  listWebhookLogs,
  type WebhookProcessingStatus,
  type WebhookProvider,
  type WebhookValidationStatus,
} from "@/lib/notifications/webhook-logs";

const providers = new Set<WebhookProvider>( [ "twilio", "resend", "ses" ] );
const validationStatuses = new Set<WebhookValidationStatus>( [ "valid", "invalid", "not_configured", "not_applicable" ] );
const processingStatuses = new Set<WebhookProcessingStatus>( [ "processed", "ignored", "rejected", "failed" ] );

function validDate( value: string | null ): string | undefined {
  if ( !value ) return undefined;
  const date = new Date( value );
  return Number.isNaN( date.getTime() ) ? undefined : date.toISOString();
}

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const params = new URL( request.url ).searchParams;
  const providerValue = params.get( "provider" ) as WebhookProvider | null;
  const validationValue = params.get( "validation" ) as WebhookValidationStatus | null;
  const processingValue = params.get( "status" ) as WebhookProcessingStatus | null;
  const from = validDate( params.get( "from" ) );
  const to = validDate( params.get( "to" ) );
  if ( params.has( "from" ) && !from || params.has( "to" ) && !to ) {
    return NextResponse.json( { success: false, error: "Invalid date range" }, { status: 400 } );
  }

  const logs = await listWebhookLogs( {
    provider: providerValue && providers.has( providerValue ) ? providerValue : undefined,
    validationStatus: validationValue && validationStatuses.has( validationValue ) ? validationValue : undefined,
    processingStatus: processingValue && processingStatuses.has( processingValue ) ? processingValue : undefined,
    eventType: params.get( "eventType" ) || undefined,
    query: params.get( "q" ) || undefined,
    from,
    to,
    page: Number( params.get( "page" ) || 1 ),
    perPage: Number( params.get( "perPage" ) || 50 ),
  } );
  return NextResponse.json( { success: true, ...logs }, { headers: { "Cache-Control": "no-store, max-age=0" } } );
}
