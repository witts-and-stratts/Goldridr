import { first } from "@/lib/pocketbase/core";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { decryptPaymentCredential, encryptPaymentCredential } from "@/lib/payments/credential-crypto";
import { resolveSettingValue } from "@/lib/settings-resolution";

export const DEFAULT_NOTIFICATION_TIME_ZONE = "America/Chicago";
export const DEFAULT_APP_URL = "http://localhost:3000";
export const DEFAULT_EMAIL_FROM_NAME = "Goldridr";
export const DEFAULT_EMAIL_FROM_ADDRESS = "notifications@example.com";
export const DEFAULT_EMAIL_REPLY_TO = "support@example.com";
export const DEFAULT_PRICE_BY_MILE_AIRPORT = 5;
export const DEFAULT_PRICE_BY_MILE_CITY = 3;
export const DEFAULT_PRICE_BY_MILE_HOURLY = 4;
export const DEFAULT_HOURLY_RATE = 75;
export const DEFAULT_ROUND_TRIP_DISCOUNT_PERCENT = 10;
export const DEFAULT_AIRPORT_PICKUP_OFFSET_MINUTES = 0;
export const DEFAULT_AIRPORT_DROPOFF_OFFSET_MINUTES = 120;
export const DEFAULT_TWILIO_FROM_NUMBER = "+10000000000";
export const DEFAULT_PAYMENT_METHODS = [ "card", "apple_pay", "cash_app", "venmo", "zelle" ] as const;
export const DEFAULT_PAYMENT_PROCESSORS = [ "stripe", "paypal", "zelle" ] as const;
export const PAYMENT_CREDENTIAL_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
] as const;

export type PaymentCredentialKey = typeof PAYMENT_CREDENTIAL_KEYS[number];
export type PaymentProcessor = typeof DEFAULT_PAYMENT_PROCESSORS[number];

function credentialEncryptionSecret(): string {
  const secret = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();
  if ( !secret ) throw new Error( "PAYMENT_SETTINGS_ENCRYPTION_KEY or AUTH_SECRET is required to store payment credentials" );
  return secret;
}

async function readTextSetting( key: string, envName: string, fallback: string ): Promise<string> {
  let stored = "";
  try {
    stored = String( ( await first( pocketBaseCollections.settings, "key = {:key}", { key } ) )?.value || "" );
  } catch {}
  return resolveSettingValue( stored, envName ? process.env[ envName ] : "", fallback );
}

async function readNumberSetting( key: string, envName: string, fallback: number ): Promise<number> {
  const raw = await readTextSetting( key, envName, String( fallback ) );
  const parsed = Number( raw );
  return Number.isFinite( parsed ) ? parsed : fallback;
}

async function writeSetting( key: string, value: string | number | undefined ): Promise<void> {
  if ( value === undefined || value === null ) return;
  const existing = await first( pocketBaseCollections.settings, "key = {:key}", { key } );
  const data = { key, value: String( value ), sourceUpdatedAt: new Date().toISOString() };
  if ( existing ) await getPocketBaseClient().collection( pocketBaseCollections.settings ).update( existing.id, data );
  else await getPocketBaseClient().collection( pocketBaseCollections.settings ).create( data );
}

export async function getPaymentCredential( key: PaymentCredentialKey ): Promise<string> {
  let stored = "";
  try {
    stored = String( ( await first( pocketBaseCollections.settings, "key = {:key}", { key: `paymentCredential:${ key }` } ) )?.value || "" ).trim();
  } catch {}
  if ( stored ) return decryptPaymentCredential( stored, credentialEncryptionSecret() );
  return resolveSettingValue( "", process.env[ key ], "" );
}

async function savePaymentCredential( key: PaymentCredentialKey, value: string ): Promise<void> {
  const normalized = value.trim();
  if ( normalized ) await writeSetting( `paymentCredential:${ key }`, encryptPaymentCredential( normalized, credentialEncryptionSecret() ) );
}

export async function getNotificationTimeZone(): Promise<string> {
  return await readTextSetting( "notificationTimezone", "NOTIFICATION_TIMEZONE", DEFAULT_NOTIFICATION_TIME_ZONE );
}

export async function getAppUrl(): Promise<string> {
  return await readTextSetting( "appUrl", "APP_URL", DEFAULT_APP_URL );
}

export async function getEmailFromName(): Promise<string> {
  return await readTextSetting( "emailFromName", "EMAIL_FROM_NAME", DEFAULT_EMAIL_FROM_NAME );
}

export async function getEmailFromAddress(): Promise<string> {
  return await readTextSetting( "emailFromAddress", "EMAIL_FROM_ADDRESS", DEFAULT_EMAIL_FROM_ADDRESS );
}

export async function getEmailReplyTo(): Promise<string | undefined> {
  const value = await readTextSetting( "emailReplyTo", "EMAIL_REPLY_TO", DEFAULT_EMAIL_REPLY_TO );
  return value || undefined;
}

export async function getPriceByMileAirport(): Promise<number> {
  return await readNumberSetting( "priceByMileAirport", "PRICE_BY_MILE_AIRPORT", DEFAULT_PRICE_BY_MILE_AIRPORT );
}

export async function getPriceByMileCity(): Promise<number> {
  return await readNumberSetting( "priceByMileCity", "PRICE_BY_MILE_CITY", DEFAULT_PRICE_BY_MILE_CITY );
}

export async function getPriceByMileHourly(): Promise<number> {
  return await readNumberSetting( "priceByMileHourly", "PRICE_BY_MILE_HOURLY", DEFAULT_PRICE_BY_MILE_HOURLY );
}

export async function getRoundTripDiscountPercent(): Promise<number> {
  const value = await readNumberSetting( "roundTripDiscountPercent", "ROUND_TRIP_DISCOUNT_PERCENT", DEFAULT_ROUND_TRIP_DISCOUNT_PERCENT );
  return Math.min( 100, Math.max( 0, value ) );
}

export async function getAirportTimingOffsets(): Promise<{ pickupOffsetMinutes: number; dropoffOffsetMinutes: number }> {
  const clamp = ( value: number ) => Math.min( 720, Math.max( 0, Math.round( value ) ) );
  return {
    pickupOffsetMinutes: clamp( await readNumberSetting( "airportPickupOffsetMinutes", "", DEFAULT_AIRPORT_PICKUP_OFFSET_MINUTES ) ),
    dropoffOffsetMinutes: clamp( await readNumberSetting( "airportDropoffOffsetMinutes", "", DEFAULT_AIRPORT_DROPOFF_OFFSET_MINUTES ) ),
  };
}

export async function getTwilioFromNumber(): Promise<string> {
  return await readTextSetting( "twilioFromNumber", "TWILIO_FROM_NUMBER", DEFAULT_TWILIO_FROM_NUMBER );
}

export async function getPaymentSettings() {
  const enabledProcessors = ( await readTextSetting( "enabledPaymentProcessors", "ENABLED_PAYMENT_PROCESSORS", DEFAULT_PAYMENT_PROCESSORS.join( "," ) ) )
    .split( "," )
    .map( value => value.trim() )
    .filter( value => DEFAULT_PAYMENT_PROCESSORS.includes( value as PaymentProcessor ) ) as PaymentProcessor[];
  const processors = enabledProcessors.length ? enabledProcessors : [ ...DEFAULT_PAYMENT_PROCESSORS ];
  const methods = ( await readTextSetting( "enabledPaymentMethods", "ENABLED_PAYMENT_METHODS", DEFAULT_PAYMENT_METHODS.join( "," ) ) )
    .split( "," )
    .map( value => value.trim() )
    .filter( value => DEFAULT_PAYMENT_METHODS.includes( value as typeof DEFAULT_PAYMENT_METHODS[number] ) );
  const configuredActiveProcessor = "stripe" as const;
  const activeProcessor = processors.includes( configuredActiveProcessor )
    ? configuredActiveProcessor
    : processors.includes( "stripe" ) ? "stripe" as const
    : configuredActiveProcessor;
  const configuredMethods = methods.length ? methods : [ ...DEFAULT_PAYMENT_METHODS ];
  const hasOnlineProcessor = processors.includes( "stripe" );
  const availableMethods = configuredMethods.filter( method => {
    if ( method === "venmo" ) return processors.includes( "paypal" );
    if ( method === "zelle" ) return processors.includes( "zelle" );
    return hasOnlineProcessor;
  } );
  return {
    activeProcessor,
    enabledProcessors: processors,
    enabledMethods: availableMethods,
    zelleRecipient: await readTextSetting( "zelleRecipient", "ZELLE_RECIPIENT", "" ),
    zelleInstructions: await readTextSetting( "zelleInstructions", "ZELLE_INSTRUCTIONS", "Send the exact fare and include your booking reference in the memo." ),
    holdMinutes: await readNumberSetting( "paymentHoldMinutes", "PAYMENT_HOLD_MINUTES", 120 ),
    zelleVerificationHours: await readNumberSetting( "zelleVerificationHours", "ZELLE_VERIFICATION_HOURS", 24 ),
    hourlyRate: await readNumberSetting( "hourlyRate", "HOURLY_RATE", DEFAULT_HOURLY_RATE ),
    paypalEnvironment: ( await readTextSetting( "paypalEnvironment", "PAYPAL_ENVIRONMENT", "sandbox" ) ) === "production" ? "production" as const : "sandbox" as const,
  };
}

export async function getPaymentCredentialHealth() {
  const credentials = Object.fromEntries( await Promise.all( PAYMENT_CREDENTIAL_KEYS.map( async key => [ key, Boolean( await getPaymentCredential( key ) ) ] ) ) ) as Record<PaymentCredentialKey, boolean>;
  return {
    stripe: credentials.STRIPE_SECRET_KEY && credentials.STRIPE_WEBHOOK_SECRET,
    paypal: credentials.PAYPAL_CLIENT_ID && credentials.PAYPAL_CLIENT_SECRET && credentials.PAYPAL_WEBHOOK_ID,
  };
}

export async function getPaymentProviderConfiguration() {
  const payment = await getPaymentSettings();
  const values = Object.fromEntries( await Promise.all( PAYMENT_CREDENTIAL_KEYS.map( async key => [ key, Boolean( await getPaymentCredential( key ) ) ] ) ) ) as Record<PaymentCredentialKey, boolean>;
  const stripeKey = await getPaymentCredential( "STRIPE_SECRET_KEY" );
  return {
    stripe: {
      environment: stripeKey.startsWith( "sk_live_" ) ? "live" : stripeKey ? "test" : "unknown",
      webhookPath: "/api/webhooks/stripe",
      credentials: {
        STRIPE_SECRET_KEY: values.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: values.STRIPE_WEBHOOK_SECRET,
      },
    },
    paypal: {
      environment: payment.paypalEnvironment,
      webhookPath: "/api/webhooks/paypal",
      credentials: {
        PAYPAL_CLIENT_ID: values.PAYPAL_CLIENT_ID,
        PAYPAL_CLIENT_SECRET: values.PAYPAL_CLIENT_SECRET,
        PAYPAL_WEBHOOK_ID: values.PAYPAL_WEBHOOK_ID,
      },
    },
  };
}

export async function getAdminSettings() {
  const payment = await getPaymentSettings();
  const airportOffsets = await getAirportTimingOffsets();
  return {
    bookingBufferMinutes: await readNumberSetting( "bookingBufferMinutes", "", 30 ),
    airportPickupOffsetMinutes: airportOffsets.pickupOffsetMinutes,
    airportDropoffOffsetMinutes: airportOffsets.dropoffOffsetMinutes,
    notificationTimezone: await getNotificationTimeZone(),
    appUrl: await getAppUrl(),
    emailFromName: await getEmailFromName(),
    emailFromAddress: await getEmailFromAddress(),
    emailReplyTo: await getEmailReplyTo() ?? "",
    priceByMileAirport: await getPriceByMileAirport(),
    priceByMileCity: await getPriceByMileCity(),
    priceByMileHourly: await getPriceByMileHourly(),
    roundTripDiscountPercent: await getRoundTripDiscountPercent(),
    twilioFromNumber: await getTwilioFromNumber(),
    ...payment,
    paymentCredentialHealth: await getPaymentCredentialHealth(),
    paymentProviders: await getPaymentProviderConfiguration(),
  };
}

export async function saveAdminSettings( settings: {
  bookingBufferMinutes: number;
  airportPickupOffsetMinutes?: number;
  airportDropoffOffsetMinutes?: number;
  notificationTimezone: string;
  appUrl: string;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
  priceByMileAirport: number;
  priceByMileCity: number;
  priceByMileHourly: number;
  roundTripDiscountPercent?: number;
  twilioFromNumber: string;
  activeProcessor: "stripe";
  enabledProcessors: PaymentProcessor[];
  enabledMethods: string[];
  zelleRecipient: string;
  zelleInstructions: string;
  holdMinutes: number;
  zelleVerificationHours: number;
  hourlyRate: number;
  paypalEnvironment: "sandbox" | "production";
  providerCredentials?: Partial<Record<PaymentCredentialKey, string>>;
} ): Promise<void> {
  await writeSetting( "bookingBufferMinutes", settings.bookingBufferMinutes );
  await writeSetting( "airportPickupOffsetMinutes", settings.airportPickupOffsetMinutes );
  await writeSetting( "airportDropoffOffsetMinutes", settings.airportDropoffOffsetMinutes );
  await writeSetting( "notificationTimezone", settings.notificationTimezone );
  await writeSetting( "appUrl", settings.appUrl );
  await writeSetting( "emailFromName", settings.emailFromName );
  await writeSetting( "emailFromAddress", settings.emailFromAddress );
  await writeSetting( "emailReplyTo", settings.emailReplyTo );
  await writeSetting( "priceByMileAirport", settings.priceByMileAirport );
  await writeSetting( "priceByMileCity", settings.priceByMileCity );
  await writeSetting( "priceByMileHourly", settings.priceByMileHourly );
  if ( settings.roundTripDiscountPercent !== undefined ) await writeSetting( "roundTripDiscountPercent", settings.roundTripDiscountPercent );
  await writeSetting( "twilioFromNumber", settings.twilioFromNumber );
  await writeSetting( "activePaymentProcessor", settings.activeProcessor );
  await writeSetting( "enabledPaymentProcessors", settings.enabledProcessors.join( "," ) );
  await writeSetting( "enabledPaymentMethods", settings.enabledMethods.join( "," ) );
  await writeSetting( "zelleRecipient", settings.zelleRecipient );
  await writeSetting( "zelleInstructions", settings.zelleInstructions );
  await writeSetting( "paymentHoldMinutes", settings.holdMinutes );
  await writeSetting( "zelleVerificationHours", settings.zelleVerificationHours );
  await writeSetting( "hourlyRate", settings.hourlyRate );
  await writeSetting( "paypalEnvironment", settings.paypalEnvironment );
  await Promise.all( Object.entries( settings.providerCredentials || {} ).map( ( [ key, value ] ) => savePaymentCredential( key as PaymentCredentialKey, value || "" ) ) );
}
