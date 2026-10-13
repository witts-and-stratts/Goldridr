import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import { buildPdfPreview } from "@/lib/invoices";

export async function GET( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const template = new URL( request.url ).searchParams.get( "template" ) || "";
  const pdf = await buildPdfPreview( template );
  if ( !pdf ) return NextResponse.json( { success: false, error: "Template not found" }, { status: 404 } );

  const body = pdf.buffer.slice( pdf.byteOffset, pdf.byteOffset + pdf.byteLength ) as ArrayBuffer;
  return new Response( body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ template }.pdf"`,
      "Cache-Control": "private, no-store",
    },
  } );
}
