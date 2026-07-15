import { NextResponse } from "next/server";
import { recordPocketBaseProviderEvent } from "@/lib/pocketbase/notifications";
import { verifySnsMessage, type SnsMessage } from "@/lib/notifications/sns";

export async function POST( request: Request ) {
  let envelope: SnsMessage;
  try {
    envelope = await request.json() as SnsMessage;
  } catch {
    return new NextResponse( "Invalid SNS payload", { status: 400 } );
  }
  if ( !( await verifySnsMessage( envelope ) ) ) {
    return new NextResponse( "Invalid SNS signature", { status: 400 } );
  }
  if ( envelope.Type !== "Notification" ) {
    return NextResponse.json( { received: true, type: envelope.Type } );
  }
  try {
    const event = JSON.parse( envelope.Message ) as {
      eventType?: string;
      notificationType?: string;
      mail?: { messageId?: string };
    };
    recordPocketBaseProviderEvent(
      "ses_api",
      envelope.MessageId,
      event.mail?.messageId,
      event.eventType || event.notificationType || "unknown",
      event
    );
    return NextResponse.json( { received: true } );
  } catch {
    return new NextResponse( "Invalid SES event", { status: 400 } );
  }
}
