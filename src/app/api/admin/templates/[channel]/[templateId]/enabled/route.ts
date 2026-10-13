import { NextResponse } from "next/server";
import z from "zod/v4";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getRegistryEntry } from "@/lib/notifications/template-registry";
import { setTemplateEnabled } from "@/lib/notifications/template-store";
import { templateErrorResponse } from "@/lib/notifications/template-http";
import type { TemplateChannel } from "@/lib/notifications/template-types";

const EnabledSchema = z.object( {
  enabled: z.boolean(),
  expectedRevision: z.number().int().min( 0 ),
  note: z.string().trim().max( 500 ).optional(),
} );

function channelOrNull( value: string ): TemplateChannel | null {
  return value === "email" || value === "sms" || value === "pdf" ? value : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string; templateId: string }> }
) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const { channel: rawChannel, templateId } = await params;
  const channel = channelOrNull( rawChannel );
  if ( !channel || !getRegistryEntry( channel, templateId ) ) {
    return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );
  }

  const body = await request.json().catch( () => null );
  const parsed = EnabledSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) }, { status: 400 } );
  }

  try {
    const template = await setTemplateEnabled( {
      channel,
      templateId,
      enabled: parsed.data.enabled,
      expectedRevision: parsed.data.expectedRevision,
      userId: session.name || session.userId,
      note: parsed.data.note,
    } );
    return NextResponse.json( { success: true, template } );
  } catch ( error ) {
    return templateErrorResponse( error );
  }
}
