import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { setSession } from "@/lib/auth";
import { getChauffeurByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

function secureStringEqual( left: string, right: string ): boolean {
  const leftBuffer = Buffer.from( left );
  const rightBuffer = Buffer.from( right );
  if ( leftBuffer.length !== rightBuffer.length ) return false;
  return timingSafeEqual( leftBuffer, rightBuffer );
}

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
      await setSession( {
        role: "admin",
        userId: "admin",
        name: process.env.ADMIN_NAME || "General Dispatcher",
        email: adminEmail,
      } );
      return NextResponse.json( { success: true, role: "admin" } );
    }

    const chauffeur = await getChauffeurByEmail( email );
    if ( chauffeur?.passwordHash && verifyPassword( password, chauffeur.passwordHash ) ) {
      await setSession( {
        role: "chauffeur",
        userId: `chauffeur:${ chauffeur.id }`,
        chauffeurId: chauffeur.id,
        name: chauffeur.name,
        email: chauffeur.email,
      } );
      return NextResponse.json( { success: true, role: "chauffeur" } );
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
