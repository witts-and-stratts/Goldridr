import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import Stripe from "stripe";
import { getPaymentCredential, getPaymentSettings, type PaymentCredentialKey } from "@/lib/admin-settings";
import type { BookingRecord } from "@/lib/pocketbase/repository";
import type { PaymentAttempt, PaymentMethod } from "./types";

async function required( name: PaymentCredentialKey ): Promise<string> {
  const value = await getPaymentCredential( name );
  if ( !value ) throw new Error( `${ name } is not configured` );
  return value;
}

async function stripeClient(): Promise<Stripe> {
  return new Stripe( await required( "STRIPE_SECRET_KEY" ) );
}

export async function createStripeCheckout( payment: PaymentAttempt, booking: BookingRecord, method: PaymentMethod, paymentPageUrl: string ) {
  const expiresAt = Math.floor( new Date( booking.holdExpiresAt || 0 ).getTime() / 1000 );
  const canUseProviderExpiry = expiresAt - Math.floor( Date.now() / 1000 ) >= 30 * 60;
  const session = await ( await stripeClient() ).checkout.sessions.create( {
    mode: "payment",
    payment_method_types: method === "cash_app" ? [ "cashapp" ] : [ "card" ],
    line_items: [ {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: payment.amountCents,
        product_data: { name: `Goldridr booking ${ booking.reference }`, description: `${ booking.date } at ${ booking.time }` },
      },
    } ],
    customer_email: booking.email,
    client_reference_id: booking.reference,
    metadata: { paymentId: String( payment.id ), bookingReference: booking.reference, method },
    payment_intent_data: { metadata: { paymentId: String( payment.id ), bookingReference: booking.reference, method } },
    success_url: `${ paymentPageUrl }/confirmation`,
    cancel_url: `${ paymentPageUrl }?payment=cancelled`,
    ...( canUseProviderExpiry ? { expires_at: expiresAt } : {} ),
  }, { idempotencyKey: payment.idempotencyKey || undefined } );
  if ( !session.url ) throw new Error( "Stripe did not return a checkout URL" );
  return { externalId: session.id, url: session.url };
}

export async function constructStripeEvent( rawBody: string, signature: string ): Promise<Stripe.Event> {
  return ( await stripeClient() ).webhooks.constructEvent( rawBody, signature, await required( "STRIPE_WEBHOOK_SECRET" ) );
}

export async function retrieveStripeCheckout( sessionId: string ): Promise<Stripe.Checkout.Session> {
  return ( await stripeClient() ).checkout.sessions.retrieve( sessionId, { expand: [ "payment_intent.latest_charge" ] } );
}

async function squareBaseUrl(): Promise<string> {
  return ( await getPaymentSettings() ).squareEnvironment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
}

function squareIdempotencyKey( value: string | number ): string {
  return `sq_${ createHash( "sha256" ).update( String( value ) ).digest( "hex" ).slice( 0, 40 ) }`;
}

async function squareRequest( path: string, init: RequestInit ): Promise<Record<string, unknown>> {
  const response = await fetch( `${ await squareBaseUrl() }${ path }`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ await required( "SQUARE_ACCESS_TOKEN" ) }`,
      "Content-Type": "application/json",
      "Square-Version": "2026-07-15",
      ...( init.headers || {} ),
    },
  } );
  const data = await response.json() as Record<string, unknown>;
  if ( !response.ok ) throw new Error( `Square request failed: ${ JSON.stringify( data.errors || data ) }` );
  return data;
}

export async function squareBrowserConfig() {
  const settings = await getPaymentSettings();
  return {
    applicationId: await required( "SQUARE_APP_ID" ),
    locationId: await required( "SQUARE_LOCATION_ID" ),
    environment: settings.squareEnvironment,
  };
}

export async function createSquarePayment( payment: PaymentAttempt, booking: BookingRecord, sourceId: string ) {
  const data = await squareRequest( "/v2/payments", {
    method: "POST",
    body: JSON.stringify( {
      source_id: sourceId,
      idempotency_key: squareIdempotencyKey( payment.idempotencyKey || payment.id ),
      amount_money: { amount: payment.amountCents, currency: "USD" },
      location_id: await required( "SQUARE_LOCATION_ID" ),
      autocomplete: true,
      reference_id: booking.reference,
      buyer_email_address: booking.email,
      note: `Goldridr booking ${ booking.reference }`,
    } ),
  } );
  const result = data.payment as Record<string, unknown>;
  return { externalId: String( result.id ), status: String( result.status || "") };
}

export async function verifySquareWebhook( rawBody: string, signature: string, notificationUrl: string ): Promise<boolean> {
  const expected = createHmac( "sha256", await required( "SQUARE_WEBHOOK_SIGNATURE_KEY" ) ).update( `${ notificationUrl }${ rawBody }` ).digest( "base64" );
  const left = Buffer.from( expected );
  const right = Buffer.from( signature );
  return left.length === right.length && timingSafeEqual( left, right );
}

async function paypalBaseUrl(): Promise<string> {
  return ( await getPaymentSettings() ).paypalEnvironment === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken(): Promise<string> {
  const credentials = Buffer.from( `${ await required( "PAYPAL_CLIENT_ID" ) }:${ await required( "PAYPAL_CLIENT_SECRET" ) }` ).toString( "base64" );
  const response = await fetch( `${ await paypalBaseUrl() }/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${ credentials }`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" } );
  const data = await response.json() as { access_token?: string };
  if ( !response.ok || !data.access_token ) throw new Error( "Unable to authenticate with PayPal" );
  return data.access_token;
}

async function paypalRequest( path: string, init: RequestInit = {} ): Promise<Record<string, unknown>> {
  const response = await fetch( `${ await paypalBaseUrl() }${ path }`, {
    ...init,
    headers: { Authorization: `Bearer ${ await paypalAccessToken() }`, "Content-Type": "application/json", ...( init.headers || {} ) },
  } );
  const data = response.status === 204 ? {} : await response.json() as Record<string, unknown>;
  if ( !response.ok ) throw new Error( `PayPal request failed: ${ JSON.stringify( data ) }` );
  return data;
}

export async function paypalBrowserConfig() {
  const settings = await getPaymentSettings();
  return { clientId: await required( "PAYPAL_CLIENT_ID" ), environment: settings.paypalEnvironment };
}

export async function createPayPalOrder( payment: PaymentAttempt, booking: BookingRecord ) {
  const data = await paypalRequest( "/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": payment.idempotencyKey || String( payment.id ) },
    body: JSON.stringify( {
      intent: "CAPTURE",
      purchase_units: [ { reference_id: booking.reference, custom_id: String( payment.id ), amount: { currency_code: "USD", value: ( payment.amountCents / 100 ).toFixed( 2 ) }, description: `Goldridr booking ${ booking.reference }` } ],
      payment_source: { venmo: { experience_context: { brand_name: "Goldridr", user_action: "PAY_NOW" } } },
    } ),
  } );
  return { externalId: String( data.id ) };
}

export async function capturePayPalOrder( orderId: string, idempotencyKey: string ) {
  return paypalRequest( `/v2/checkout/orders/${ encodeURIComponent( orderId ) }/capture`, { method: "POST", headers: { "PayPal-Request-Id": `${ idempotencyKey }:capture` }, body: "{}" } );
}

export async function verifyPayPalWebhook( headers: Headers, event: unknown ): Promise<boolean> {
  const data = await paypalRequest( "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify( {
      auth_algo: headers.get( "paypal-auth-algo" ),
      cert_url: headers.get( "paypal-cert-url" ),
      transmission_id: headers.get( "paypal-transmission-id" ),
      transmission_sig: headers.get( "paypal-transmission-sig" ),
      transmission_time: headers.get( "paypal-transmission-time" ),
      webhook_id: await required( "PAYPAL_WEBHOOK_ID" ),
      webhook_event: event,
    } ),
  } );
  return data.verification_status === "SUCCESS";
}

export async function refundProviderPayment( payment: PaymentAttempt ): Promise<string> {
  if ( payment.provider === "stripe" ) {
    if ( !payment.transactionReference ) throw new Error( "Stripe PaymentIntent is missing" );
    const refund = await ( await stripeClient() ).refunds.create( { payment_intent: payment.transactionReference, reason: "requested_by_customer", metadata: { paymentId: String( payment.id ), bookingReference: payment.bookingReference } }, { idempotencyKey: `${ payment.idempotencyKey || payment.id }:refund` } );
    return refund.id;
  }
  if ( payment.provider === "square" ) {
    if ( !payment.transactionReference ) throw new Error( "Square payment ID is missing" );
  const data = await squareRequest( "/v2/refunds", { method: "POST", body: JSON.stringify( { idempotency_key: squareIdempotencyKey( `${ payment.idempotencyKey || payment.id }:refund` ), payment_id: payment.transactionReference, amount_money: { amount: payment.amountCents, currency: "USD" }, reason: `Refund ${ payment.bookingReference }` } ) } );
    return String( ( data.refund as Record<string, unknown> ).id );
  }
  if ( payment.provider === "paypal" ) {
    if ( !payment.transactionReference ) throw new Error( "PayPal capture ID is missing" );
    const data = await paypalRequest( `/v2/payments/captures/${ encodeURIComponent( payment.transactionReference ) }/refund`, { method: "POST", headers: { "PayPal-Request-Id": `${ payment.idempotencyKey || payment.id }:refund` }, body: JSON.stringify( { amount: { value: ( payment.amountCents / 100 ).toFixed( 2 ), currency_code: "USD" }, note_to_payer: `Refund for booking ${ payment.bookingReference }` } ) } );
    return String( data.id );
  }
  throw new Error( "Zelle refunds must be completed manually" );
}
