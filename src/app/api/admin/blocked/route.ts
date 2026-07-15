import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  saveBlockedSlot, getAllBlockedSlots, getBlockedSlotsForChauffeur,
  deleteBlockedSlot, deleteChauffeurBlockedSlot,
} from "@/lib/pocketbase/repository";

// GET all blocked slots
export async function GET() {
  try {
    const session = await getSession();
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    const blocks = session.role === "admin"
      ? await getAllBlockedSlots()
      : await getBlockedSlotsForChauffeur( session.chauffeurId! );
    return NextResponse.json( { success: true, blocks } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to load blocked slots";
    return NextResponse.json( 
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST create a new blocked slot
export async function POST( request: Request ) {
  try {
    const session = await getSession();
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    const body = await request.json();
    const { title, date, endDate, isFullDay, time, duration, recurring, chauffeurId } = body;

    // Validate inputs
    if ( !title || !date ) {
      return NextResponse.json( 
        { success: false, error: "Missing required fields: title, date" },
        { status: 400 }
      );
    }

    const fullDayFlag = isFullDay ? 1 : 0;
    const blockTime = fullDayFlag ? "00:00" : time || "00:00";
    const blockDuration = fullDayFlag ? 1440 : parseInt( duration || "60" );

    if ( !fullDayFlag && !time ) {
      return NextResponse.json( 
        { success: false, error: "Missing required field: time when not a full day block" },
        { status: 400 }
      );
    }

    if ( isNaN( blockDuration ) || blockDuration <= 0 ) {
      return NextResponse.json( 
        { success: false, error: "Duration must be a positive integer" },
        { status: 400 }
      );
    }

    const saved = await saveBlockedSlot( {
      title,
      date,
      endDate: endDate || undefined,
      isFullDay: fullDayFlag,
      time: blockTime,
      duration: blockDuration,
      recurring: recurring || "none",
      chauffeurId: session.role === "chauffeur"
        ? session.chauffeurId
        : chauffeurId !== undefined && chauffeurId !== "" && chauffeurId !== null
          ? String( chauffeurId )
          : null
    } );

    return NextResponse.json( { success: true, block: saved } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to create blocked slot";
    return NextResponse.json( 
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE a blocked slot
export async function DELETE( request: Request ) {
  try {
    const session = await getSession();
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    const { searchParams } = new URL( request.url );
    const idStr = searchParams.get( "id" );

    if ( !idStr ) {
      return NextResponse.json( 
        { success: false, error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    const id = parseInt( idStr );
    if ( isNaN( id ) ) {
      return NextResponse.json( 
        { success: false, error: "Invalid blocked slot id format" },
        { status: 400 }
      );
    }

    const deleted = session.role === "admin"
      ? await deleteBlockedSlot( id )
      : await deleteChauffeurBlockedSlot( id, session.chauffeurId! );
    if ( !deleted ) {
      return NextResponse.json( 
        { success: false, error: "Blocked slot not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to delete blocked slot";
    return NextResponse.json( 
      { success: false, error: message },
      { status: 500 }
    );
  }
}
