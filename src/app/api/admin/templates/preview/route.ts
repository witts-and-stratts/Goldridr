import { NextResponse } from "next/server";
import z from "zod/v4";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getRegistryEntry } from "@/lib/notifications/template-registry";
import { renderContentForPayload } from "@/lib/notifications/template-store";
import { validateTemplateContent } from "@/lib/notifications/template-validation";
import { renderEmailPreview } from "@/templates/email/goldridr-email";
import { smsDisclosureFor, withCompliance } from "@/lib/notifications/sms-program";
import { extractVariables } from "@/lib/notifications/template-context";
import { SMS_BODY_OPT_OUT } from "@/lib/sms-consent-copy";
import type { EmailEditableContent, SmsContent, TemplateChannel } from "@/lib/notifications/template-types";

const PreviewSchema = z.object( {
  channel: z.enum( [ "email", "sms", "pdf" ] ),
  templateId: z.string().trim().min( 1 ).max( 160 ),
  content: z.unknown().optional(),
  payload: z.record( z.string(), z.unknown() ).optional(),
} );

export async function POST( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const body = await request.json().catch( () => null );
  const parsed = PreviewSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) }, { status: 400 } );
  }

  const { channel, templateId } = parsed.data;
  const entry = getRegistryEntry( channel as TemplateChannel, templateId );
  if ( !entry ) return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );

  const payload = parsed.data.payload || entry.samplePayload;
  const unknownVariables = parsed.data.content
    ? extractVariables( JSON.stringify( parsed.data.content ) ).filter( variable => !entry.allowedVariables.includes( variable ) )
    : [];

  const baseContent = parsed.data.content === undefined
    ? entry.defaultContent( payload )
    : undefined;
  const validation = baseContent !== undefined
    ? { ok: true as const, content: baseContent, warnings: [] as string[] }
    : validateTemplateContent( channel as TemplateChannel, templateId, parsed.data.content );
  if ( !validation.ok ) {
    return NextResponse.json( { success: false, error: "Invalid template content", details: validation.errors }, { status: 400 } );
  }
  const rendered = renderContentForPayload( channel as TemplateChannel, validation.content ?? entry.defaultContent( payload ), payload );

  if ( channel === "email" ) {
    const preview = await renderEmailPreview( templateId, payload, rendered as EmailEditableContent );
    return NextResponse.json( { success: true, rendered, unknownVariables, warnings: validation.warnings, email: preview } );
  }
  if ( channel === "sms" ) {
    const body = ( rendered as SmsContent ).body || "";
    const full = withCompliance( body, smsDisclosureFor( templateId ) );
    const segments = Math.max( 1, Math.ceil( full.length / 160 ) );
    return NextResponse.json( { success: true, rendered, unknownVariables, warnings: validation.warnings, sms: { full, segments, characters: full.length, optOut: SMS_BODY_OPT_OUT } } );
  }
  return NextResponse.json( { success: true, rendered, unknownVariables, warnings: validation.warnings } );
}
