import { NextResponse } from "next/server";
import { getPaymentCredentialHealth, getPaymentSettings } from "@/lib/admin-settings";
import { expirePaymentHolds, findBookingByPaymentToken } from "@/lib/payments/repository";
import { paypalBrowserConfig, squareBrowserConfig } from "@/lib/payments/providers";

export async function GET( _request: Request, { params }: { params: Promise<{ token: string }> } ) {
  await expirePaymentHolds();
  const { token } = await params;
  const booking = await findBookingByPaymentToken( token );
  if ( !booking ) return NextResponse.json( { success: false, error: "Payment link not found" }, { status: 404 } );
  const settings = await getPaymentSettings();
  const health = await getPaymentCredentialHealth();
  const trip = JSON.parse( booking.tripDetails || "{}" ) as Record<string, unknown>;

  let square: Awaited<ReturnType<typeof squareBrowserConfig>> | null = null;
  let paypal: Awaited<ReturnType<typeof paypalBrowserConfig>> | null = null;
  if ( settings.activeProcessor === "square" && health.square ) square = await squareBrowserConfig();
  if ( settings.enabledMethods.includes( "venmo" ) && health.paypal ) paypal = await paypalBrowserConfig();

  return NextResponse.json( {
    success: true,
    checkout: {
      reference: booking.reference,
      status: booking.status,
      date: booking.date,
      time: booking.time,
      tripType: booking.tripType,
      pickup: trip.pickupLocation || "",
      destination: trip.dropoffLocation || "",
      distance: trip.estimatedDistance || "",
      driveTime: trip.estimatedDuration || "",
      subtotalCents: booking.quoteSubtotalCents || 0,
      discountCents: booking.quoteDiscountCents || 0,
      totalCents: booking.quoteTotalCents || 0,
      currency: booking.quoteCurrency || "USD",
      holdExpiresAt: booking.holdExpiresAt,
      enabledMethods: settings.enabledMethods,
      activeProcessor: settings.activeProcessor,
      zelleRecipient: settings.zelleRecipient,
      zelleInstructions: settings.zelleInstructions,
      square,
      paypal,
      credentialHealth: health,
    },
  } );
}
