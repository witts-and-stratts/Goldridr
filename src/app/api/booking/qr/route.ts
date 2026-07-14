import sharp from "sharp";
import ErrorCorrectLevel from "qr.js/lib/ErrorCorrectLevel";
import QRCodeGenerator from "qr.js/lib/QRCode";
import { getAppUrl } from "@/lib/admin-settings";
import { getBookingVerifyUrl } from "@/lib/booking-qr";

// export const runtime = "nodejs";

export async function GET( request: Request ) {
  const url = new URL( request.url );
  const reference = url.searchParams.get( "reference" )?.trim().toUpperCase() || "";
  const email = url.searchParams.get( "email" )?.trim().toLowerCase() || "";

  if ( !/^[A-Z0-9-]{4,32}$/.test( reference ) || !email || email.length > 254 ) {
    return Response.json(
      { success: false, error: "A valid booking reference and email are required" },
      { status: 400 }
    );
  }

  const appUrl = await getAppUrl() || url.origin;
  const verifyUrl = getBookingVerifyUrl( appUrl, reference, email );
  const qr = new QRCodeGenerator( -1, ErrorCorrectLevel.M );
  qr.addData( verifyUrl );
  qr.make();
  const cells = qr.modules;
  const quietZone = 4;
  const viewBoxSize = cells.length + quietZone * 2;
  const path = cells.map( ( row, rowIndex ) =>
    row.map( ( cell, cellIndex ) =>
      cell ? `M ${ cellIndex + quietZone } ${ rowIndex + quietZone }h1v1h-1z` : ""
    ).join( "" )
  ).join( "" );
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${ viewBoxSize } ${ viewBoxSize }">`,
    `<title>Booking ${ reference }</title>`,
    `<rect width="${ viewBoxSize }" height="${ viewBoxSize }" fill="#fff"/>`,
    `<path d="${ path }" fill="#111"/>`,
    "</svg>",
  ].join( "" );
  const png = await sharp( Buffer.from( svg ) )
    .png( { palette: true, compressionLevel: 9 } )
    .toBuffer();

  return new Response( new Uint8Array( png ), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${ reference }-qr.png"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  } );
}
