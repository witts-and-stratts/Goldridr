import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createChauffeur, deleteChauffeur, getAllChauffeurs, assignVehicleToChauffeur, getDb } from "@/lib/db";
import { getRequestSession } from "@/lib/driver-auth";

export async function GET( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }
    const chauffeurs = await getAllChauffeurs();
    return NextResponse.json( { success: true, chauffeurs } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to retrieve chauffeurs list";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if ( !name || !email || !password ) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if ( !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email ) ) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 }
      );
    }

    if ( password.length < 8 ) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const chauffeur = await createChauffeur( { name, email, phone, password } );
    return NextResponse.json( { success: true, chauffeur }, { status: 201 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to add chauffeur";
    const status = message.includes( "already exists" ) ? 409 : 500;
    return NextResponse.json( { success: false, error: message }, { status } );
  }
}

export async function PATCH( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

    const body = await req.json();
    const chauffeurId = Number( body.id );
    if ( !Number.isInteger( chauffeurId ) || chauffeurId <= 0 ) {
      return NextResponse.json( { success: false, error: "A valid chauffeur id is required" }, { status: 400 } );
    }

    if ( "vehicleId" in body ) {
      const vehicleId = body.vehicleId == null ? null : Number( body.vehicleId );
      if ( vehicleId !== null && ( !Number.isInteger( vehicleId ) || vehicleId <= 0 ) ) {
        return NextResponse.json( { success: false, error: "Invalid vehicle id" }, { status: 400 } );
      }
      try {
        if ( vehicleId === null ) {
          await ( await getDb() ).prepare( "UPDATE chauffeurs SET vehicleId = NULL WHERE id = ?" ).run( chauffeurId );
        } else {
          await assignVehicleToChauffeur( chauffeurId, vehicleId );
        }
      } catch ( err: unknown ) {
        const message = err instanceof Error ? err.message : "Failed to assign vehicle";
        return NextResponse.json( { success: false, error: message }, { status: 400 } );
      }
      const chauffeurs = await getAllChauffeurs();
      const updated = chauffeurs.find( c => c.id === chauffeurId );
      return NextResponse.json( { success: true, chauffeur: updated } );
    }

    return NextResponse.json( { success: false, error: "Nothing to update" }, { status: 400 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to update chauffeur";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const { searchParams } = new URL( req.url );
    const id = Number( searchParams.get( "id" ) );

    if ( !Number.isInteger( id ) || id <= 0 ) {
      return NextResponse.json(
        { success: false, error: "A valid chauffeur id is required" },
        { status: 400 }
      );
    }

    if ( !await deleteChauffeur( id ) ) {
      return NextResponse.json(
        { success: false, error: "Chauffeur not found" },
        { status: 404 }
      );
    }

    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to delete chauffeur";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
