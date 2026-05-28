import { NextResponse } from "next/server";
import { getAllChauffeurs } from "@/lib/db";

export async function GET() {
  try {
    const chauffeurs = getAllChauffeurs();
    return NextResponse.json( { success: true, chauffeurs } );
  } catch ( err: any ) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve chauffeurs list" },
      { status: 500 }
    );
  }
}
