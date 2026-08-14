import { NextResponse } from "next/server";
import { getPaymentCredentialHealth, getPaymentSettings } from "@/lib/admin-settings";
import { expirePaymentHolds, findBookingByPaymentToken, latestPaymentForBooking } from "@/lib/payments/repository";
import { paypalBrowserConfig, squareBrowserConfig } from "@/lib/payments/providers";

export async function GET( _request: Request, { params }: { params: Promise<{ token: string }> } ) {
  await expirePaymentHolds();
  const { token } = await params;
  const booking = await findBookingByPaymentToken( token );
  if ( !booking ) return NextResponse.json( { success: false, error: "Payment link not found" }, { status: 404 } );
  const settings = await getPaymentSettings();
  const health = await getPaymentCredentialHealth();
  const trip = JSON.parse( booking.tripDetails || "{}" ) as Record<string, unknown>;
  const payment = await latestPaymentForBooking( booking.reference );

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
      billingContact: (() => {
        const nameParts = booking.name.trim().split(/\s+/).filter( Boolean );
        return {
          givenName: nameParts[0] || "Customer",
          familyName: nameParts.slice( 1 ).join( " " ) || nameParts[0] || "Customer",
          email: booking.email,
          phone: booking.phone,
          countryCode: "US",
        };
      })(),
      square,
      paypal,
      credentialHealth: health,
      payment: payment ? {
        status: payment.status,
        method: payment.method,
        provider: payment.provider,
        amountCents: payment.amountCents,
        currency: payment.currency,
        paymentReference: payment.transactionReference,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        cardExpiryMonth: payment.cardExpiryMonth,
        cardExpiryYear: payment.cardExpiryYear,
        walletType: payment.walletType,
        receiptUrl: payment.receiptUrl,
        paidAt: payment.paidAt,
        failureMessage: payment.failureMessage,
      } : null,
    },
  } );
}
