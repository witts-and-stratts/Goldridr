import { NextResponse } from "next/server";
import z from "zod/v4";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getRegistryEntry } from "@/lib/notifications/template-registry";
import { getTemplateView, resetTemplate, saveTemplate } from "@/lib/notifications/template-store";
import { templateErrorResponse } from "@/lib/notifications/template-http";
import { validateTemplateContent } from "@/lib/notifications/template-validation";
import type { TemplateChannel } from "@/lib/notifications/template-types";

const MutationSchema = z.object( {
  expectedRevision: z.number().int().min( 0 ),
  content: z.unknown().optional(),
  note: z.string().trim().max( 500 ).optional(),
} );

async function authorize( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return { error: NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } ) };
  if ( !isAdmin( session ) ) return { error: NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } ) };
  return { session };
}

function channelOrNull( value: string ): TemplateChannel | null {
  return value === "email" || value === "sms" || value === "pdf" ? value : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channel: string; templateId: string }> }
) {
  const auth = await authorize( request );
  if ( auth.error ) return auth.error;
  const { channel: rawChannel, templateId } = await params;
  const channel = channelOrNull( rawChannel );
  if ( !channel || !getRegistryEntry( channel, templateId ) ) {
    return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );
  }
  const view = await getTemplateView( channel, templateId );
  if ( !view ) return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );
  return NextResponse.json( { success: true, template: view } );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ channel: string; templateId: string }> }
) {
  const auth = await authorize( request );
  if ( auth.error ) return auth.error;
  const { channel: rawChannel, templateId } = await params;
  const channel = channelOrNull( rawChannel );
  if ( !channel || !getRegistryEntry( channel, templateId ) ) {
    return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );
  }

  const body = await request.json().catch( () => null );
  const parsed = MutationSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) }, { status: 400 } );
  }

  const validation = validateTemplateContent( channel, templateId, parsed.data.content );
  if ( !validation.ok ) {
    return NextResponse.json( { success: false, error: "Invalid template content", details: validation.errors }, { status: 400 } );
  }

  try {
    const template = await saveTemplate( {
      channel,
      templateId,
      content: validation.content!,
      expectedRevision: parsed.data.expectedRevision,
      userId: auth.session!.name || auth.session!.userId,
      note: parsed.data.note,
    } );
    return NextResponse.json( { success: true, template, warnings: validation.warnings } );
  } catch ( error ) {
    return templateErrorResponse( error );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ channel: string; templateId: string }> }
) {
  const auth = await authorize( request );
  if ( auth.error ) return auth.error;
  const { channel: rawChannel, templateId } = await params;
  const channel = channelOrNull( rawChannel );
  if ( !channel || !getRegistryEntry( channel, templateId ) ) {
    return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );
  }

  const body = await request.json().catch( () => ( {} ) );
  const parsed = MutationSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) }, { status: 400 } );
  }

  try {
    const template = await resetTemplate( {
      channel,
      templateId,
      expectedRevision: parsed.data.expectedRevision,
      userId: auth.session!.name || auth.session!.userId,
      note: parsed.data.note,
    } );
    return NextResponse.json( { success: true, template } );
  } catch ( error ) {
    return templateErrorResponse( error );
  }
}
