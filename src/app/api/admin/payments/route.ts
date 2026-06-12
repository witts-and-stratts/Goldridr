import { NextResponse } from "next/server";
import z from "zod/v4";
import { getSession, isAdmin } from "@/lib/auth";
import {
  createPayment,
  deletePayment,
  getAllPayments,
  updatePayment,
} from "@/lib/db";

const PaymentStatus = z.enum( [ "pending", "paid", "refunded", "failed" ] );
const PaymentMethod = z.enum( [ "card", "cash", "bank_transfer", "other" ] );

const CreatePaymentSchema = z.object( {
  bookingReference: z.string().min( 1 ),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length( 3 ).optional().default( "USD" ),
  method: PaymentMethod,
  status: PaymentStatus,
  transactionReference: z.string().trim().max( 120 ).nullable().optional(),
  notes: z.string().trim().max( 1000 ).nullable().optional(),
} );

const UpdatePaymentSchema = z.object( {
  id: z.number().int().positive(),
  amountCents: z.number().int().nonnegative().optional(),
  method: PaymentMethod.optional(),
  status: PaymentStatus.optional(),
  transactionReference: z.string().trim().max( 120 ).nullable().optional(),
  notes: z.string().trim().max( 1000 ).nullable().optional(),
} );

async function requireAdmin() {
  const session = await getSession();
  if ( !session ) {
    return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
  }
  if ( !isAdmin( session ) ) {
    return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
  }
  return null;
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if ( authError ) return authError;

    return NextResponse.json( { success: true, payments: getAllPayments() } );
  } catch ( error: unknown ) {
    const message = error instanceof Error ? error.message : "Failed to fetch payments";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function POST( request: Request ) {
  try {
    const authError = await requireAdmin();
    if ( authError ) return authError;

    const parsed = CreatePaymentSchema.safeParse( await request.json() );
    if ( !parsed.success ) {
      return NextResponse.json(
        { success: false, error: "Invalid payment", details: z.prettifyError( parsed.error ) },
        { status: 400 }
      );
    }

    const payment = createPayment( parsed.data );
    return NextResponse.json( { success: true, payment }, { status: 201 } );
  } catch ( error: unknown ) {
    const message = error instanceof Error ? error.message : "Failed to create payment";
    const status = message === "Booking not found"
      ? 404
      : message === "Cannot record a payment for a cancelled booking"
        ? 422
        : 500;
    return NextResponse.json( { success: false, error: message }, { status } );
  }
}

export async function PATCH( request: Request ) {
  try {
    const authError = await requireAdmin();
    if ( authError ) return authError;

    const parsed = UpdatePaymentSchema.safeParse( await request.json() );
    if ( !parsed.success ) {
      return NextResponse.json(
        { success: false, error: "Invalid payment update", details: z.prettifyError( parsed.error ) },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    if ( !updatePayment( id, updates ) ) {
      return NextResponse.json( { success: false, error: "Payment not found" }, { status: 404 } );
    }
    return NextResponse.json( { success: true } );
  } catch ( error: unknown ) {
    const message = error instanceof Error ? error.message : "Failed to update payment";
    const status = message === "Cannot record a payment for a cancelled booking" ? 422 : 500;
    return NextResponse.json( { success: false, error: message }, { status } );
  }
}

export async function DELETE( request: Request ) {
  try {
    const authError = await requireAdmin();
    if ( authError ) return authError;

    const id = Number( new URL( request.url ).searchParams.get( "id" ) );
    if ( !Number.isInteger( id ) || id <= 0 ) {
      return NextResponse.json( { success: false, error: "Invalid payment id" }, { status: 400 } );
    }
    if ( !deletePayment( id ) ) {
      return NextResponse.json( { success: false, error: "Payment not found" }, { status: 404 } );
    }
    return NextResponse.json( { success: true } );
  } catch ( error: unknown ) {
    const message = error instanceof Error ? error.message : "Failed to delete payment";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
