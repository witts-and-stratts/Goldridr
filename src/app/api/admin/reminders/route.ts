import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllBookings, getBookingsForChauffeur, getDb } from "@/lib/db";
import { createManualReminder, listReminderDeliveries } from "@/lib/notifications/store";

export async function GET() {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const bookings = session.role === "admin"
    ? getAllBookings()
    : getBookingsForChauffeur( session.chauffeurId! );
  return NextResponse.json( {
    success: true,
    reminders: listReminderDeliveries( getDb(), session ),
    bookings: bookings.map( booking => ( {
      reference: booking.reference,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      smsConsented: Boolean( booking.phone && booking.smsConsentedAt ),
      date: booking.date,
      time: booking.time,
      status: booking.status,
    } ) ),
  } );
}

export async function POST( request: Request ) {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const body = await request.json();
  const allowedBookings = session.role === "admin"
    ? getAllBookings()
    : getBookingsForChauffeur( session.chauffeurId! );
  const booking = allowedBookings.find( item => item.reference === body.reference );
  if ( !booking ) return NextResponse.json( { success: false, error: "Booking not found" }, { status: 404 } );
  if ( [ "cancelled", "rejected" ].includes( booking.status ) ) {
    return NextResponse.json( { success: false, error: "Cannot remind a cancelled or rejected booking" }, { status: 422 } );
  }
  const channels = Array.isArray( body.channels )
    ? body.channels.filter( ( channel: string ) => channel === "email" || channel === "sms" )
    : [];
  if ( channels.length === 0 ) {
    return NextResponse.json( { success: false, error: "Select at least one channel" }, { status: 400 } );
  }
  if ( channels.includes( "sms" ) && !( booking.phone && booking.smsConsentedAt ) ) {
    return NextResponse.json( { success: false, error: "Passenger has not consented to SMS" }, { status: 422 } );
  }
  const notificationId = createManualReminder( getDb(), session, booking, channels );
  return NextResponse.json( { success: true, notificationId }, { status: 201 } );
}
