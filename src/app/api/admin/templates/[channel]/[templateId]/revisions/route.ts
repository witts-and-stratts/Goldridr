import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { getRegistryEntry } from "@/lib/notifications/template-registry";
import { listTemplateRevisions } from "@/lib/notifications/template-store";
import type { TemplateChannel } from "@/lib/notifications/template-types";

function channelOrNull( value: string ): TemplateChannel | null {
  return value === "email" || value === "sms" || value === "pdf" ? value : null;
}

export async function GET(
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
  return NextResponse.json( { success: true, revisions: await listTemplateRevisions( channel, templateId ) } );
}
