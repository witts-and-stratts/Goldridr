import { NextResponse } from "next/server";
import z from "zod/v4";
import { getRequestSession } from "@/lib/driver-auth";
import { extendPaymentHold } from "@/lib/payments/repository";

const Schema = z.object( { extensionMinutes: z.number().int().min( 1 ).max( 10_080 ) } );

export async function POST( request: Request, { params }: { params: Promise<{ reference: string }> } ) {
  const session = await getRequestSession( request );
  if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  if ( session.role !== "admin" ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

  const parsed = Schema.safeParse( await request.json() );
  const { reference } = await params;
  if ( !parsed.success || !reference.trim() ) {
    return NextResponse.json( { success: false, error: "extensionMinutes must be an integer between 1 and 10080" }, { status: 400 } );
  }

  const result = await extendPaymentHold( reference, parsed.data.extensionMinutes );
  if ( result.kind === "not_found" ) return NextResponse.json( { success: false, error: "Booking not found" }, { status: 404 } );
  if ( result.kind === "invalid_status" ) {
    return NextResponse.json( { success: false, error: "Only bookings awaiting payment or payment verification can have their payment window extended" }, { status: 409 } );
  }
  if ( result.kind === "extended" ) return NextResponse.json( { success: true, holdExpiresAt: result.holdExpiresAt } );

  return NextResponse.json( { success: false, error: "Unable to extend the payment window" }, { status: 500 } );
}
