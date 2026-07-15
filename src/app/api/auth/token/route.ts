import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { authenticatePocketBaseUser } from "@/lib/pocketbase/auth";
import { getPocketBaseChauffeurByEmail } from "@/lib/pocketbase/operations";

/**
 * Token-based sign-in for the Goldridr Chauffeur mobile app. Accepts the same
 * credentials as /api/auth/login (admin or chauffeur) but returns the signed
 * session token in the body instead of setting a cookie, since the app sends
 * it back as an `Authorization: Bearer <token>` header.
 */
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
    if ( !session ) return NextResponse.json( { success: false, error: "Invalid email or password" }, { status: 401 } );
    const chauffeur = session.role === "chauffeur" ? await getPocketBaseChauffeurByEmail( session.email ) : null;
    return NextResponse.json( {
      success: true,
      token: createSessionToken( session ),
      role: session.role,
      user: { name: session.name, email: session.email },
      ...( chauffeur ? { chauffeur: { id: chauffeur.id, name: chauffeur.name, email: chauffeur.email, phone: chauffeur.phone || null } } : {} ),
    } );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to sign in" },
      { status: 500 }
    );
  }
}
