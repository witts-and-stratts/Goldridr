import { NextResponse } from "next/server";
import { consumePocketBasePasswordResetToken, updatePocketBaseChauffeur } from "@/lib/pocketbase/operations";

export async function POST( request: Request ) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if ( !token || !password ) {
      return NextResponse.json( { success: false, error: "Token and password are required" }, { status: 400 } );
    }
    if ( password.length < 8 ) {
      return NextResponse.json( { success: false, error: "Password must be at least 8 characters" }, { status: 400 } );
    }

    const chauffeurId = await consumePocketBasePasswordResetToken( token );
    if ( !chauffeurId ) {
      return NextResponse.json( { success: false, error: "This reset link is invalid or has expired" }, { status: 400 } );
    }

    await updatePocketBaseChauffeur( chauffeurId, { password } );
    return NextResponse.json( { success: true } );
  } catch {
    return NextResponse.json( { success: false, error: "Something went wrong" }, { status: 500 } );
  }
}
