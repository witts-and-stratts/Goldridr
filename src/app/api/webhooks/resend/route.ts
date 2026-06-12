import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { recordProviderEvent } from "@/lib/notifications/store";

export async function POST( request: Request ) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if ( !secret || !apiKey ) return new NextResponse( "Webhook is not configured", { status: 503 } );
  try {
    const payload = await request.text();
    const event = new Resend( apiKey ).webhooks.verify( {
      payload,
      headers: {
        id: request.headers.get( "svix-id" ) || "",
        timestamp: request.headers.get( "svix-timestamp" ) || "",
        signature: request.headers.get( "svix-signature" ) || "",
      },
      webhookSecret: secret,
    } ) as { id?: string; type: string; created_at?: string; data?: { email_id?: string; id?: string } };
    const providerEventId = event.id || `${ event.type }:${ event.data?.email_id || event.data?.id }:${ event.created_at || "" }`;
    recordProviderEvent(
      getDb(),
      "resend",
      providerEventId,
      event.data?.email_id || event.data?.id,
      event.type,
      event
    );
    return NextResponse.json( { received: true } );
  } catch {
    return new NextResponse( "Invalid webhook signature", { status: 400 } );
  }
}
