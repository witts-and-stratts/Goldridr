import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSessionToken } from "@/lib/auth";
import { getChauffeurByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { authenticatePocketBaseUser } from "@/lib/pocketbase/auth";
import { isPocketBaseAuthEnabled } from "@/lib/pocketbase/config";

function secureStringEqual( left: string, right: string ): boolean {
  const leftBuffer = Buffer.from( left );
  const rightBuffer = Buffer.from( right );
  if ( leftBuffer.length !== rightBuffer.length ) return false;
  return timingSafeEqual( leftBuffer, rightBuffer );
}

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

    if ( isPocketBaseAuthEnabled() ) {
      const session = await authenticatePocketBaseUser( email, password );
      if ( !session ) {
        return NextResponse.json( { success: false, error: "Invalid email or password" }, { status: 401 } );
      }
      const chauffeur = session.role === "chauffeur"
        ? await getChauffeurByEmail( session.email )
        : null;
      return NextResponse.json( {
        success: true,
        token: createSessionToken( session ),
        role: session.role,
        user: { name: session.name, email: session.email },
        ...( chauffeur ? {
          chauffeur: {
            id: chauffeur.id,
            name: chauffeur.name,
            email: chauffeur.email,
            phone: chauffeur.phone ?? null,
          },
        } : {} ),
      } );
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if ( !adminEmail || !adminPassword ) {
      console.error( "ADMIN_EMAIL and ADMIN_PASSWORD must be configured" );
      return NextResponse.json(
        { success: false, error: "Authentication is not configured" },
        { status: 503 }
      );
    }

    if ( secureStringEqual( email, adminEmail ) && secureStringEqual( password, adminPassword ) ) {
      const session = {
        role: "admin" as const,
        userId: "admin",
        name: process.env.ADMIN_NAME || "General Dispatcher",
        email: adminEmail,
      };
      return NextResponse.json( {
        success: true,
        token: createSessionToken( session ),
        role: session.role,
        user: { name: session.name, email: session.email },
      } );
    }

    const chauffeur = await getChauffeurByEmail( email );
    if ( chauffeur?.passwordHash && verifyPassword( password, chauffeur.passwordHash ) ) {
      const session = {
        role: "chauffeur" as const,
        userId: `chauffeur:${ chauffeur.id }`,
        chauffeurId: chauffeur.id,
        name: chauffeur.name,
        email: chauffeur.email,
      };
      return NextResponse.json( {
        success: true,
        token: createSessionToken( session ),
        role: session.role,
        user: { name: chauffeur.name, email: chauffeur.email },
        chauffeur: {
          id: chauffeur.id,
          name: chauffeur.name,
          email: chauffeur.email,
          phone: chauffeur.phone ?? null,
        },
      } );
    }

    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to sign in" },
      { status: 500 }
    );
  }
}
