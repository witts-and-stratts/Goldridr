import {
  SMS_BODY_FULL_DISCLOSURE,
  SMS_BODY_OPT_OUT,
} from "@/lib/sms-consent-copy";
import { buildTemplateContext, stringValue } from "@/lib/notifications/template-context";
import { renderLiquidText } from "@/lib/notifications/liquid";
import type { SmsContent } from "@/lib/notifications/template-types";

export function withCompliance( body: string, disclosure: string ): string {
  const trimmed = body.trim();
  return trimmed.endsWith( disclosure ) ? trimmed : `${ trimmed } ${ disclosure }`;
}

const smsTemplateCache = new Map<string, string>();

function sourceTemplateName( template: string ): string {
  return template.replaceAll( ":", "_" );
}

function sourceTemplateId( template: string, payload: Record<string, unknown> ): string {
  const key = template.split( ":" )[ 0 ];
  if ( template.includes( ":" ) ) return template;
  if ( key === "booking_assignment" ) {
    return stringValue( payload.chauffeurName ) ? "booking_assignment:assigned" : "booking_assignment:unassigned";
  }
  if ( key === "booking_status" ) {
    return [ "confirmed", "accepted" ].includes( stringValue( payload.status ).toLowerCase() ) ? "booking_status:confirmed" : "booking_status:updated";
  }
  return template;
}

function sourceTemplate( template: string ): string {
  const name = sourceTemplateName( template );
  const cached = smsTemplateCache.get( name );
  if ( cached ) return cached;
  const content = readFileSync( join( process.cwd(), "src", "templates", "sms", `${ name }.txt` ), "utf8" ).trim();
  smsTemplateCache.set( name, content );
  return content;
}

function trimEmptyTerminal( body: string ): string {
  return body.replace( /^Terminal:\s*\r?\n?/m, "" ).replace( /\n{2,}/g, "\n" ).trim();
}

// Returns the editable message body without the compliance suffix. `template` may
// be a base delivery key ("booking_assignment") or a variant id ("booking_assignment:assigned").
export function smsDraftBody( template: string, payload: Record<string, unknown> ): string {
  const key = template.split( ":" )[ 0 ];

  if ( key === "manual_message" || key === "broadcast" ) {
    return stringValue( payload.message ).slice( 0, 1500 - SMS_BODY_OPT_OUT.length - 1 );
  }
  const source = sourceTemplateId( template, payload );
  return trimEmptyTerminal( renderLiquidText( sourceTemplate( source ), buildTemplateContext( payload ) ) );
}

export function smsDefaultEditorContent( template: string, payload: Record<string, unknown> ): SmsContent {
  return { body: sourceTemplate( sourceTemplateId( template, payload ) ) };
}

export function smsDisclosureFor( template: string ): string {
  return template.split( ":" )[ 0 ] === "booking_created" ? SMS_BODY_FULL_DISCLOSURE : SMS_BODY_OPT_OUT;
}

export function smsDefaultContent( templateId: string, payload: Record<string, unknown> ): SmsContent {
  return { body: smsDraftBody( templateId, payload ) };
}

export function buildSmsBody( template: string | null, payload: Record<string, unknown> ): string {
  const resolved = template || "default";
  return withCompliance( smsDraftBody( resolved, payload ), smsDisclosureFor( resolved ) );
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
import { readFileSync } from "node:fs";
import { join } from "node:path";
