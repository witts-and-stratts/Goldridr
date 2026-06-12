import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { createChauffeur, deleteChauffeur, getAllChauffeurs } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }
    const chauffeurs = getAllChauffeurs();
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
    const session = await getSession();
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

    const chauffeur = createChauffeur( { name, email, phone, password } );
    return NextResponse.json( { success: true, chauffeur }, { status: 201 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to add chauffeur";
    const status = message.includes( "already exists" ) ? 409 : 500;
    return NextResponse.json( { success: false, error: message }, { status } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = await getSession();
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

    if ( !deleteChauffeur( id ) ) {
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
