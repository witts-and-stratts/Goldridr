import { NextResponse } from "next/server";
import z from "zod/v4";
import { isAdmin } from "@/lib/auth";
import { getRequestSession } from "@/lib/driver-auth";
import {
  createDiscountCode,
  deleteDiscountCode,
  getDiscountCodesWithUsage,
  updateDiscountCode,
} from "@/lib/pocketbase/repository";

const KindSchema = z.enum( [ "percent", "fixed" ] );

const DiscountCodeSchema = z.object( {
  code: z.string().min( 2 ).max( 32 ),
  label: z.string().min( 2 ).max( 120 ),
  kind: KindSchema,
  value: z.number().positive(),
  active: z.boolean().optional().default( true ),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
} );

const DiscountCodeUpdateSchema = z.object( {
  id: z.number().int().positive(),
  code: z.string().min( 2 ).max( 32 ).optional(),
  label: z.string().min( 2 ).max( 120 ).optional(),
  kind: KindSchema.optional(),
  value: z.number().positive().optional(),
  active: z.boolean().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
} );

async function requireAdmin( request: Request ) {
  const session = await getRequestSession( request );
  if ( !session ) {
    return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  }
  if ( !isAdmin( session ) ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  }
  return null;
}

export async function GET( request: Request ) {
  const authError = await requireAdmin( request );
  if ( authError ) return authError;
  return NextResponse.json( { success: true, discountCodes: await getDiscountCodesWithUsage() } );
}

export async function POST( request: Request ) {
  const authError = await requireAdmin( request );
  if ( authError ) return authError;

  const parsed = DiscountCodeSchema.safeParse( await request.json() );
  if ( !parsed.success ) {
    return NextResponse.json(
      { success: false, error: "Invalid discount code", details: z.prettifyError( parsed.error ) },
      { status: 400 }
    );
  }

  if ( parsed.data.kind === "percent" && parsed.data.value > 100 ) {
    return NextResponse.json(
      { success: false, error: "Percent discount codes cannot exceed 100" },
      { status: 400 }
    );
  }
  if ( parsed.data.kind === "fixed" && !Number.isInteger( parsed.data.value ) ) {
    return NextResponse.json(
      { success: false, error: "Fixed discount codes must be stored as whole cents" },
      { status: 400 }
    );
  }

  const discount = await createDiscountCode( parsed.data );
  return NextResponse.json( { success: true, discountCode: discount }, { status: 201 } );
}

export async function PATCH( request: Request ) {
  const authError = await requireAdmin( request );
  if ( authError ) return authError;

  const parsed = DiscountCodeUpdateSchema.safeParse( await request.json() );
  if ( !parsed.success ) {
    return NextResponse.json(
      { success: false, error: "Invalid discount code update", details: z.prettifyError( parsed.error ) },
      { status: 400 }
    );
  }

  if ( parsed.data.kind === "percent" && parsed.data.value !== undefined && parsed.data.value > 100 ) {
    return NextResponse.json(
      { success: false, error: "Percent discount codes cannot exceed 100" },
      { status: 400 }
    );
  }
  if ( parsed.data.kind === "fixed" && parsed.data.value !== undefined && !Number.isInteger( parsed.data.value ) ) {
    return NextResponse.json(
      { success: false, error: "Fixed discount codes must be stored as whole cents" },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;
  if ( !await updateDiscountCode( id, updates ) ) {
    return NextResponse.json( { success: false, error: "Discount code not found" }, { status: 404 } );
  }
  return NextResponse.json( { success: true } );
}

export async function DELETE( request: Request ) {
  const authError = await requireAdmin( request );
  if ( authError ) return authError;

  const id = Number( new URL( request.url ).searchParams.get( "id" ) );
  if ( !Number.isInteger( id ) || id <= 0 ) {
    return NextResponse.json( { success: false, error: "Invalid discount code id" }, { status: 400 } );
  }
  if ( !await deleteDiscountCode( id ) ) {
    return NextResponse.json( { success: false, error: "Discount code not found" }, { status: 404 } );
  }
  return NextResponse.json( { success: true } );
}
