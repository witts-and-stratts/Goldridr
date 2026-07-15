import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { authenticatePocketBaseUser } from "@/lib/pocketbase/auth";

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
    await setSession( session );
    return NextResponse.json( { success: true, role: session.role } );
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to sign in" },
      { status: 500 }
    );
  }
}
