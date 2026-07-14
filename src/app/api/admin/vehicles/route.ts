import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import {
  getAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignVehicleToChauffeur,
  unassignVehicle,
  getVehicleById,
} from "@/lib/db";

export async function GET( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    const vehicles = await getAllVehicles();
    return NextResponse.json( { success: true, vehicles } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to retrieve vehicles";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function POST( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

    const body = await req.json();
    const make = typeof body.make === "string" ? body.make.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const year = body.year != null ? Number( body.year ) : undefined;
    const colour = typeof body.colour === "string" ? body.colour.trim() : undefined;
    const plate = typeof body.plate === "string" ? body.plate.trim() : undefined;

    if ( !make || !model ) {
      return NextResponse.json( { success: false, error: "Make and model are required" }, { status: 400 } );
    }

    const vehicle = await createVehicle( { make, model, year: year && Number.isFinite( year ) ? year : undefined, colour, plate } );
    return NextResponse.json( { success: true, vehicle }, { status: 201 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to create vehicle";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function PATCH( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

    const body = await req.json();
    const id = Number( body.id );
    if ( !Number.isInteger( id ) || id <= 0 ) {
      return NextResponse.json( { success: false, error: "A valid vehicle id is required" }, { status: 400 } );
    }

    // Assign or unassign vehicle to/from a chauffeur
    if ( "chauffeurId" in body ) {
      const chauffeurId = body.chauffeurId == null ? null : String( body.chauffeurId ).trim();
      if ( chauffeurId !== null && !chauffeurId ) {
        return NextResponse.json( { success: false, error: "Invalid chauffeur id" }, { status: 400 } );
      }
      try {
        if ( chauffeurId === null ) {
          await unassignVehicle( id );
        } else {
          await assignVehicleToChauffeur( chauffeurId, id );
        }
      } catch ( err: unknown ) {
        const message = err instanceof Error ? err.message : "Failed to assign vehicle";
        return NextResponse.json( { success: false, error: message }, { status: 400 } );
      }
      return NextResponse.json( { success: true } );
    }

    // Update vehicle fields
    const updated = await updateVehicle( id, {
      make: typeof body.make === "string" ? body.make : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
      year: body.year != null ? Number( body.year ) : undefined,
      colour: body.colour !== undefined ? body.colour : undefined,
      plate: body.plate !== undefined ? body.plate : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    } );

    if ( !updated ) return NextResponse.json( { success: false, error: "Vehicle not found" }, { status: 404 } );
    const vehicle = await getVehicleById( id );
    return NextResponse.json( { success: true, vehicle } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to update vehicle";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

    const { searchParams } = new URL( req.url );
    const id = Number( searchParams.get( "id" ) );
    if ( !Number.isInteger( id ) || id <= 0 ) {
      return NextResponse.json( { success: false, error: "A valid vehicle id is required" }, { status: 400 } );
    }

    if ( !await deleteVehicle( id ) ) {
      return NextResponse.json( { success: false, error: "Vehicle not found" }, { status: 404 } );
    }
    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to delete vehicle";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
