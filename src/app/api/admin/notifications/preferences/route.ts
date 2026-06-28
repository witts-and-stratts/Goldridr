import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRequestSession } from "@/lib/driver-auth";
import { getPreferences, setPreference } from "@/lib/notifications/store";
import type { NotificationCategory } from "@/lib/notifications/types";

const CATEGORIES: NotificationCategory[] = [ "bookings", "reminders", "messages", "system" ];

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  return NextResponse.json( { success: true, preferences: await getPreferences( await getDb(), session.userId ) } );
}

export async function PUT( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const body = await request.json();
  if ( !CATEGORIES.includes( body.category ) ) {
    return NextResponse.json( { success: false, error: "Invalid category" }, { status: 400 } );
  }
  await setPreference( await getDb(), session.userId, body.category, {
    inApp: body.inApp !== false,
    email: body.email !== false,
    sms: body.sms === true,
  } );
  return NextResponse.json( { success: true } );
}
