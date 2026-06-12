import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getAllBookings, getBookingsForChauffeur, getDb, type BookingRecord } from "@/lib/db";
import { createBroadcast, createManualMessage } from "@/lib/notifications/store";

export async function GET() {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const bookings = session.role === "admin"
    ? getAllBookings()
    : getBookingsForChauffeur( session.chauffeurId! );
  const ridersByEmail = new Map<string, BookingRecord>();
  for ( const booking of bookings ) {
    const key = booking.email.trim().toLowerCase();
    if ( !ridersByEmail.has( key ) ) ridersByEmail.set( key, booking );
  }
  return NextResponse.json( {
    success: true,
    riders: [ ...ridersByEmail.values() ].map( booking => ( {
      reference: booking.reference,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      smsConsented: Boolean( booking.phone && booking.smsConsentedAt ),
      date: booking.date,
      time: booking.time,
    } ) ),
  } );
}

export async function POST( request: Request ) {
  const session = await getSession();
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  const body = await request.json();
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const channels = Array.isArray( body.channels ) ? body.channels : [];
  if ( !subject || !message || channels.length === 0 ) {
    return NextResponse.json( { success: false, error: "Subject, message, and channels are required" }, { status: 400 } );
  }

  if ( body.kind === "booking" ) {
    const booking = getDb().prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( body.reference ) as BookingRecord | undefined;
    if ( !booking ) return NextResponse.json( { success: false, error: "Booking not found" }, { status: 404 } );
    if ( session.role === "chauffeur" && booking.chauffeurId !== session.chauffeurId ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }
    const requestedChannels = channels.filter( ( channel: string ) => channel === "email" || channel === "sms" );
    if ( requestedChannels.includes( "sms" ) && !( booking.phone && booking.smsConsentedAt ) ) {
      return NextResponse.json( { success: false, error: "Passenger has not consented to SMS" }, { status: 422 } );
    }
    const notificationId = createManualMessage( getDb(), session, booking, subject, message, requestedChannels );
    return NextResponse.json( { success: true, notificationId }, { status: 201 } );
  }

  if ( body.kind === "broadcast" ) {
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    const chauffeurIds = Array.isArray( body.chauffeurIds )
      ? body.chauffeurIds.map( Number ).filter( ( id: number ) => Number.isInteger( id ) && id > 0 )
      : [];
    const validChannels = channels.filter( ( channel: string ) => [ "in_app", "email", "sms" ].includes( channel ) );
    const notificationId = createBroadcast( getDb(), session, chauffeurIds, subject, message, validChannels );
    return NextResponse.json( { success: true, notificationId }, { status: 201 } );
  }

  if ( body.kind === "recipients" ) {
    const riderReferences = Array.isArray( body.riderReferences )
      ? body.riderReferences.filter( ( value: unknown ): value is string => typeof value === "string" )
      : [];
    const chauffeurIds = Array.isArray( body.chauffeurIds )
      ? body.chauffeurIds.map( Number ).filter( ( id: number ) => Number.isInteger( id ) && id > 0 )
      : [];
    if ( riderReferences.length === 0 && chauffeurIds.length === 0 ) {
      return NextResponse.json( { success: false, error: "Select at least one recipient" }, { status: 400 } );
    }
    if ( chauffeurIds.length > 0 && !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Only administrators can message chauffeurs" }, { status: 403 } );
    }

    const allowedBookings = session.role === "admin"
      ? getAllBookings()
      : getBookingsForChauffeur( session.chauffeurId! );
    const allowedByReference = new Map( allowedBookings.map( booking => [ booking.reference, booking ] ) );
    const requestedChannels = channels.filter( ( channel: string ) => channel === "email" || channel === "sms" );
    const notificationIds: number[] = [];
    const skippedSms: string[] = [];

    for ( const reference of riderReferences ) {
      const booking = allowedByReference.get( reference );
      if ( !booking ) continue;
      const riderChannels = requestedChannels.filter( ( channel: string ) => {
        if ( channel !== "sms" ) return true;
        if ( booking.phone && booking.smsConsentedAt ) return true;
        skippedSms.push( booking.name );
        return false;
      } );
      if ( riderChannels.length > 0 ) {
        notificationIds.push( createManualMessage( getDb(), session, booking, subject, message, riderChannels ) );
      }
    }

    if ( chauffeurIds.length > 0 ) {
      const chauffeurChannels = channels.filter( ( channel: string ) => [ "in_app", "email", "sms" ].includes( channel ) );
      notificationIds.push( createBroadcast( getDb(), session, chauffeurIds, subject, message, chauffeurChannels ) );
    }

    if ( notificationIds.length === 0 ) {
      return NextResponse.json(
        { success: false, error: "The selected channels cannot reach these recipients" },
        { status: 422 }
      );
    }
    return NextResponse.json( { success: true, notificationIds, skippedSms }, { status: 201 } );
  }

  return NextResponse.json( { success: false, error: "Invalid message kind" }, { status: 400 } );
}
