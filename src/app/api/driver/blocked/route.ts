import { NextResponse } from "next/server";
import {
  saveBlockedSlot,
  getBlockedSlotsForChauffeur,
  deleteChauffeurBlockedSlot,
} from "@/lib/db";
import { getDriverSession, unauthorizedResponse } from "@/lib/driver-auth";

const RECURRING_VALUES = [ "none", "daily", "weekly", "weekends" ];

export async function GET( req: Request ) {
  try {
    const session = getDriverSession( req );
    if ( !session ) return unauthorizedResponse();

    const blocks = getBlockedSlotsForChauffeur( session.chauffeurId );
    return NextResponse.json( { success: true, blocks } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to load blocked slots";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function POST( req: Request ) {
  try {
    const session = getDriverSession( req );
    if ( !session ) return unauthorizedResponse();

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const endDate = typeof body.endDate === "string" && body.endDate ? body.endDate : undefined;
    const recurring = typeof body.recurring === "string" ? body.recurring : "none";

    if ( !title || !/^\d{4}-\d{2}-\d{2}$/.test( date ) ) {
      return NextResponse.json(
        { success: false, error: "Title and date (YYYY-MM-DD) are required" },
        { status: 400 }
      );
    }

    if ( !RECURRING_VALUES.includes( recurring ) ) {
      return NextResponse.json(
        { success: false, error: `Recurring must be one of: ${ RECURRING_VALUES.join( ", " ) }` },
        { status: 400 }
      );
    }

    const isFullDay = body.isFullDay ? 1 : 0;
    const time = isFullDay ? "00:00" : body.time;
    const duration = isFullDay ? 1440 : Number.parseInt( String( body.duration ?? "60" ), 10 );

    if ( !isFullDay && !/^\d{2}:\d{2}$/.test( String( time ) ) ) {
      return NextResponse.json(
        { success: false, error: "Time (HH:MM) is required when not a full-day block" },
        { status: 400 }
      );
    }

    if ( Number.isNaN( duration ) || duration <= 0 ) {
      return NextResponse.json(
        { success: false, error: "Duration must be a positive number of minutes" },
        { status: 400 }
      );
    }

    const block = saveBlockedSlot( {
      title,
      date,
      endDate,
      isFullDay,
      time,
      duration,
      recurring,
      chauffeurId: session.chauffeurId,
    } );

    return NextResponse.json( { success: true, block }, { status: 201 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to create blocked slot";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = getDriverSession( req );
    if ( !session ) return unauthorizedResponse();

    const { searchParams } = new URL( req.url );
    const id = Number.parseInt( searchParams.get( "id" ) ?? "", 10 );
    if ( Number.isNaN( id ) ) {
      return NextResponse.json(
        { success: false, error: "A numeric block id is required" },
        { status: 400 }
      );
    }

    const deleted = deleteChauffeurBlockedSlot( id, session.chauffeurId );
    if ( !deleted ) {
      return NextResponse.json(
        { success: false, error: "Blocked slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to delete blocked slot";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
