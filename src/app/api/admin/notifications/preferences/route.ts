import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPreferences, setPreference } from "@/lib/notifications/store";
import type { NotificationCategory } from "@/lib/notifications/types";

const CATEGORIES: NotificationCategory[] = [ "bookings", "reminders", "messages", "system" ];

export async function GET() {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  return NextResponse.json( { success: true, preferences: getPreferences( getDb(), session.userId ) } );
}

export async function PUT( request: Request ) {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const body = await request.json();
  if ( !CATEGORIES.includes( body.category ) ) {
    return NextResponse.json( { success: false, error: "Invalid category" }, { status: 400 } );
  }
  setPreference( getDb(), session.userId, body.category, {
    inApp: body.inApp !== false,
    email: body.email !== false,
    sms: body.sms === true,
  } );
  return NextResponse.json( { success: true } );
}
