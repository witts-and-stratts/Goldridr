import z from "zod/v4";
import { SMS_BODY_FULL_DISCLOSURE, SMS_BODY_OPT_OUT } from "@/lib/sms-consent-copy";
import { getRegistryEntry } from "./template-registry";
import { buildTemplateContext, extractVariables, renderTemplate } from "./template-context";
import type { TemplateChannel, TemplateContent } from "./template-types";

export const ChannelSchema = z.enum( [ "email", "sms", "pdf" ] );

export const SmsContentSchema = z.object( {
  body: z.string().trim().min( 1, "Message is required" ).max( 1500 ),
} );

export const EmailContentSchema = z.object( {
  subject: z.string().trim().max( 200 ).optional(),
  preview: z.string().trim().max( 200 ).optional(),
  heading: z.string().trim().max( 200 ).optional(),
  message: z.string().trim().min( 1, "Message is required" ).max( 4000 ),
  ctaLabel: z.string().trim().max( 80 ).optional(),
  footerNote: z.string().trim().max( 500 ).optional(),
} );

export const PdfContentSchema = z.object( {
  title: z.string().trim().max( 160 ).optional(),
  intro: z.string().trim().max( 500 ).optional(),
  footer: z.string().trim().max( 500 ).optional(),
} );

export function contentSchemaForChannel( channel: TemplateChannel ) {
  if ( channel === "sms" ) return SmsContentSchema;
  if ( channel === "email" ) return EmailContentSchema;
  return PdfContentSchema;
}

function contentStrings( channel: TemplateChannel, content: Record<string, unknown> ): string[] {
  if ( channel === "sms" ) return [ String( content.body ?? "" ) ];
  if ( channel === "email" ) {
    return [ content.subject, content.preview, content.heading, content.message, content.ctaLabel, content.footerNote ]
      .filter( ( value ): value is string => typeof value === "string" );
  }
  return [ content.title, content.intro, content.footer ].filter( ( value ): value is string => typeof value === "string" );
}

export interface ContentValidation {
  ok: boolean;
  content?: TemplateContent;
  errors: string[];
  warnings: string[];
}

const GSM_7_BASIC = new Set( "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà" );
const GSM_7_EXTENSION = new Set( "^{}\\[~]|€" );
const MAX_SMS_SEGMENTS = 3;

export function smsMetrics( value: string ): { encoding: "gsm7" | "ucs2"; units: number; segments: number } {
  let gsm7 = true;
  let units = 0;
  for ( const character of value ) {
    if ( GSM_7_BASIC.has( character ) ) units += 1;
    else if ( GSM_7_EXTENSION.has( character ) ) units += 2;
    else {
      gsm7 = false;
      units += [...character].length;
    }
  }
  if ( !gsm7 ) {
    units = [...value].length;
    return { encoding: "ucs2", units, segments: Math.max( 1, Math.ceil( units / ( units <= 70 ? 70 : 67 ) ) ) };
  }
  return { encoding: "gsm7", units, segments: Math.max( 1, Math.ceil( units / ( units <= 160 ? 160 : 153 ) ) ) };
}

export function validateRenderedSmsBody( templateId: string, body: string ): string[] {
  const disclosure = templateId.split( ":" )[ 0 ] === "booking_created" ? SMS_BODY_FULL_DISCLOSURE : SMS_BODY_OPT_OUT;
  if ( body.includes( disclosure ) ) return [ "Compliance copy is server-managed and must not appear in the editable message" ];
  const metrics = smsMetrics( `${ body.trim() } ${ disclosure }` );
  return metrics.segments > MAX_SMS_SEGMENTS
    ? [ `Rendered message exceeds the ${ MAX_SMS_SEGMENTS }-segment SMS limit (${ metrics.segments } ${ metrics.encoding.toUpperCase() } segments)` ]
    : [];
}

export function validateTemplateContent(
  channel: TemplateChannel,
  templateId: string,
  raw: unknown
): ContentValidation {
  const entry = getRegistryEntry( channel, templateId );
  if ( !entry ) return { ok: false, errors: [ "Unknown template" ], warnings: [] };

  const parsed = contentSchemaForChannel( channel ).safeParse( raw );
  if ( !parsed.success ) {
    return { ok: false, errors: parsed.error.issues.map( issue => issue.message ), warnings: [] };
  }

  const content = parsed.data as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  const allowed = new Set( entry.allowedVariables );
  for ( const value of contentStrings( channel, content ) ) {
    for ( const variable of extractVariables( value ) ) {
      if ( !allowed.has( variable ) ) errors.push( `Unknown variable {{ ${ variable } }} for ${ templateId }` );
    }
    if ( channel === "pdf" && /[<>]/.test( value ) ) {
      errors.push( "Raw angle brackets are not allowed; use {{ variables }} instead" );
    }
  }

  if ( channel === "sms" ) {
    const renderedBody = renderTemplate( String( ( content as Record<string, unknown> ).body ?? "" ), buildTemplateContext( entry.samplePayload ) );
    errors.push( ...validateRenderedSmsBody( templateId, renderedBody ) );
    const metrics = smsMetrics( `${ renderedBody.trim() } ${ templateId.split( ":" )[ 0 ] === "booking_created" ? SMS_BODY_FULL_DISCLOSURE : SMS_BODY_OPT_OUT }` );
    if ( metrics.segments > 1 ) warnings.push( `Sample renders as ${ metrics.segments } ${ metrics.encoding.toUpperCase() } segments` );
  }

  if ( errors.length ) return { ok: false, errors, warnings };
  return { ok: true, content: content as TemplateContent, errors, warnings };
}
