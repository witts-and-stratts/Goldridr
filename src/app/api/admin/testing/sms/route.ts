import { NextResponse } from "next/server";
import z from "zod/v4";
import { getTwilioFromNumber } from "@/lib/admin-settings";
import { isAdmin, type AuthSession } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import {
  clearMockSmsMessages,
  insertMockSmsMessage,
  listMockSmsMessages,
  updateMockSmsMessageStatus,
} from "@/lib/db";

const SmsStatusSchema = z.enum( [ "queued", "sent", "delivered", "failed", "undelivered" ] );

function requireAdmin( session: AuthSession | null ) {
  return session && isAdmin( session );
}

function toMessage( record: Awaited<ReturnType<typeof listMockSmsMessages>>[number] ) {
  return {
    sid: record.sid,
    accountSid: record.accountSid,
    from: record.fromNumber,
    to: record.toNumber,
    body: record.body,
    status: record.status,
    errorMessage: record.errorMessage,
    dateCreated: record.createdAt,
    dateUpdated: record.updatedAt,
  };
}

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !requireAdmin( session ) ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  }

  const { searchParams } = new URL( request.url );
  const limit = Math.max( 1, Math.min( 100, Number( searchParams.get( "limit" ) || "25" ) || 25 ) );
  const messages = await listMockSmsMessages( limit );

  return NextResponse.json( {
    success: true,
    transport: "mock",
    count: messages.length,
    messages: messages.map( toMessage ),
  } );
}

export async function POST( request: Request ) {
  const session = await getRequestSession( request );
  if ( !requireAdmin( session ) ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  }

  const body = await request.json();
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const from = typeof body.from === "string" ? body.from.trim() : await getTwilioFromNumber();
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const status = typeof body.status === "string" && SmsStatusSchema.safeParse( body.status ).success
    ? body.status
    : "queued";

  if ( !to || !from || !messageBody ) {
    return NextResponse.json(
      { success: false, error: "To, from, and body are required" },
      { status: 400 }
    );
  }

  const record = await insertMockSmsMessage( {
    accountSid: typeof body.accountSid === "string" ? body.accountSid.trim() : null,
    fromNumber: from,
    toNumber: to,
    body: messageBody,
    status,
    errorMessage: typeof body.errorMessage === "string" ? body.errorMessage.trim() || null : null,
  } );

  return NextResponse.json( {
    success: true,
    message: toMessage( record ),
  }, { status: 201 } );
}

export async function PATCH( request: Request ) {
  const session = await getRequestSession( request );
  if ( !requireAdmin( session ) ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  }

  const body = await request.json();
  const sid = typeof body.sid === "string" ? body.sid.trim() : "";
  const status = typeof body.status === "string" && SmsStatusSchema.safeParse( body.status ).success
    ? body.status
    : "";

  if ( !sid || !status ) {
    return NextResponse.json(
      { success: false, error: "sid and status are required" },
      { status: 400 }
    );
  }

  const updated = await updateMockSmsMessageStatus(
    sid,
    status,
    typeof body.errorMessage === "string" ? body.errorMessage.trim() || null : null
  );

  if ( !updated ) {
    return NextResponse.json( { success: false, error: "Message not found" }, { status: 404 } );
  }

  return NextResponse.json( { success: true } );
}

export async function DELETE( request: Request ) {
  const session = await getRequestSession( request );
  if ( !requireAdmin( session ) ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  }

  const deleted = await clearMockSmsMessages();
  return NextResponse.json( { success: true, deleted } );
}
