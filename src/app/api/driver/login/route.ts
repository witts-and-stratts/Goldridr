import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { authenticatePocketBaseUser } from "@/lib/pocketbase/auth";
import { getPocketBaseChauffeurByEmail } from "@/lib/pocketbase/operations";

export async function POST( request: Request ) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if ( !email || !password ) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const session = await authenticatePocketBaseUser( email, password );
    if ( !session || session.role !== "chauffeur" || !session.chauffeurId ) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }
    const chauffeur = await getPocketBaseChauffeurByEmail( session.email );
    if ( !chauffeur ) return NextResponse.json( { success: false, error: "Chauffeur profile is unavailable" }, { status: 503 } );

    return NextResponse.json( {
      success: true,
      token: createSessionToken( session ),
      chauffeur: {
        id: chauffeur.id,
        name: chauffeur.name,
        email: chauffeur.email,
        phone: chauffeur.phone,
      },
    } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
