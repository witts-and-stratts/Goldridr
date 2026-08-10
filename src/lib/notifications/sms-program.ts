import {
  SMS_BODY_FULL_DISCLOSURE,
  SMS_BODY_OPT_OUT,
} from "@/lib/sms-consent-copy";

function withCompliance( body: string, disclosure: string ): string {
  const trimmed = body.trim();
  return trimmed.endsWith( disclosure ) ? trimmed : `${ trimmed } ${ disclosure }`;
}

export function buildSmsBody( template: string | null, payload: Record<string, unknown> ): string {
  if ( template === "manual_message" || template === "broadcast" ) {
    const message = String( payload.message || "" ).slice( 0, 1500 - SMS_BODY_OPT_OUT.length - 1 );
    return withCompliance( message, SMS_BODY_OPT_OUT );
  }

  const reference = String( payload.bookingReference || "" );
  const tripDetails = payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
  const terminal = typeof tripDetails.terminal === "string" && tripDetails.terminal.trim()
    ? ` Terminal: ${ tripDetails.terminal.trim() }.`
    : "";

  if ( template === "booking_reminder" ) {
    return withCompliance( `GoldRidrreminder: booking ${ reference } is scheduled for ${ payload.date } at ${ payload.time }.${ terminal }`, SMS_BODY_OPT_OUT );
  }
  if ( template === "booking_created" ) {
    return withCompliance( `Goldridr: we received booking ${ reference } for ${ payload.date } at ${ payload.time }.${ terminal } We will notify you when it is confirmed.`, SMS_BODY_FULL_DISCLOSURE );
  }
  if ( template === "booking_assignment" ) {
    const chauffeur = String( payload.chauffeurName || "" );
    return withCompliance( chauffeur
      ? `GoldRidrupdate: ${ chauffeur } is assigned to booking ${ reference }.${ terminal }`
      : `GoldRidrupdate: booking ${ reference } is awaiting a chauffeur assignment.${ terminal }`, SMS_BODY_OPT_OUT );
  }
  if ( template === "booking_deleted" ) {
    return withCompliance( `GoldRidrupdate: booking ${ reference } was deleted.${ terminal } Contact us if this was unexpected.`, SMS_BODY_OPT_OUT );
  }
  return withCompliance( `GoldRidrupdate: booking ${ reference } is now ${ payload.status || "updated" }.${ terminal }`, SMS_BODY_OPT_OUT );
}

export function resolveTwilioWebhookUrl( request: Request, configuredUrl?: string ): string {
  if ( configuredUrl?.trim() ) return configuredUrl.trim();
  const forwardedProto = request.headers.get( "x-forwarded-proto" );
  const forwardedHost = request.headers.get( "x-forwarded-host" );
  if ( forwardedProto && forwardedHost ) {
    return `${ forwardedProto }://${ forwardedHost }${ new URL( request.url ).pathname }`;
  }
  return request.url;
}
