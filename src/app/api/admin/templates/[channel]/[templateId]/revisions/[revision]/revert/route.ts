import { NextResponse } from "next/server";
import z from "zod/v4";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getRegistryEntry } from "@/lib/notifications/template-registry";
import { revertTemplate } from "@/lib/notifications/template-store";
import { templateErrorResponse } from "@/lib/notifications/template-http";
import type { TemplateChannel } from "@/lib/notifications/template-types";

const RevertSchema = z.object( {
  expectedRevision: z.number().int().min( 0 ),
  note: z.string().trim().max( 500 ).optional(),
} );

function channelOrNull( value: string ): TemplateChannel | null {
  return value === "email" || value === "sms" || value === "pdf" ? value : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string; templateId: string; revision: string }> }
) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const { channel: rawChannel, templateId, revision: rawRevision } = await params;
  const channel = channelOrNull( rawChannel );
  const revision = Number( rawRevision );
  if ( !channel || !getRegistryEntry( channel, templateId ) || !Number.isInteger( revision ) || revision < 1 ) {
    return NextResponse.json( { success: false, error: "Template revision not found" }, { status: 404 } );
  }

  const body = await request.json().catch( () => null );
  const parsed = RevertSchema.safeParse( body );
  if ( !parsed.success ) {
    return NextResponse.json( { success: false, error: "Validation failed", details: z.prettifyError( parsed.error ) }, { status: 400 } );
  }

  try {
    const template = await revertTemplate( {
      channel,
      templateId,
      revision,
      expectedRevision: parsed.data.expectedRevision,
      userId: session.name || session.userId,
      note: parsed.data.note,
    } );
    return NextResponse.json( { success: true, template } );
  } catch ( error ) {
    return templateErrorResponse( error );
  }
}
