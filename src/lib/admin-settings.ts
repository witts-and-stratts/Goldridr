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
export const DEFAULT_TWILIO_FROM_NUMBER = "+10000000000";
export const DEFAULT_PAYMENT_METHODS = [ "card", "apple_pay", "cash_app", "venmo", "zelle" ] as const;
export const DEFAULT_PAYMENT_PROCESSORS = [ "stripe", "square", "paypal", "zelle" ] as const;
export const PAYMENT_CREDENTIAL_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_APP_ID",
  "SQUARE_LOCATION_ID",
  "SQUARE_WEBHOOK_SIGNATURE_KEY",
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
  const configuredActiveProcessor = ( await readTextSetting( "activePaymentProcessor", "ACTIVE_PAYMENT_PROCESSOR", "stripe" ) ) === "square" ? "square" as const : "stripe" as const;
  const activeProcessor = processors.includes( configuredActiveProcessor )
    ? configuredActiveProcessor
    : processors.includes( "stripe" ) ? "stripe" as const
    : processors.includes( "square" ) ? "square" as const
    : configuredActiveProcessor;
  const configuredMethods = methods.length ? methods : [ ...DEFAULT_PAYMENT_METHODS ];
  const hasOnlineProcessor = processors.includes( "stripe" ) || processors.includes( "square" );
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
    squareEnvironment: ( await readTextSetting( "squareEnvironment", "SQUARE_ENVIRONMENT", "sandbox" ) ) === "production" ? "production" as const : "sandbox" as const,
    paypalEnvironment: ( await readTextSetting( "paypalEnvironment", "PAYPAL_ENVIRONMENT", "sandbox" ) ) === "production" ? "production" as const : "sandbox" as const,
  };
}

export async function getPaymentCredentialHealth() {
  const credentials = Object.fromEntries( await Promise.all( PAYMENT_CREDENTIAL_KEYS.map( async key => [ key, Boolean( await getPaymentCredential( key ) ) ] ) ) ) as Record<PaymentCredentialKey, boolean>;
  return {
    stripe: credentials.STRIPE_SECRET_KEY && credentials.STRIPE_WEBHOOK_SECRET,
    square: credentials.SQUARE_ACCESS_TOKEN && credentials.SQUARE_APP_ID && credentials.SQUARE_LOCATION_ID && credentials.SQUARE_WEBHOOK_SIGNATURE_KEY,
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
    square: {
      environment: payment.squareEnvironment,
      webhookPath: "/api/webhooks/square",
      credentials: {
        SQUARE_ACCESS_TOKEN: values.SQUARE_ACCESS_TOKEN,
        SQUARE_APP_ID: values.SQUARE_APP_ID,
        SQUARE_LOCATION_ID: values.SQUARE_LOCATION_ID,
        SQUARE_WEBHOOK_SIGNATURE_KEY: values.SQUARE_WEBHOOK_SIGNATURE_KEY,
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
  return {
    bookingBufferMinutes: await readNumberSetting( "bookingBufferMinutes", "", 30 ),
    notificationTimezone: await getNotificationTimeZone(),
    appUrl: await getAppUrl(),
    emailFromName: await getEmailFromName(),
    emailFromAddress: await getEmailFromAddress(),
    emailReplyTo: await getEmailReplyTo() ?? "",
    priceByMileAirport: await getPriceByMileAirport(),
    priceByMileCity: await getPriceByMileCity(),
    priceByMileHourly: await getPriceByMileHourly(),
    twilioFromNumber: await getTwilioFromNumber(),
    ...payment,
    paymentCredentialHealth: await getPaymentCredentialHealth(),
    paymentProviders: await getPaymentProviderConfiguration(),
  };
}

export async function saveAdminSettings( settings: {
  bookingBufferMinutes: number;
  notificationTimezone: string;
  appUrl: string;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
  priceByMileAirport: number;
  priceByMileCity: number;
  priceByMileHourly: number;
  twilioFromNumber: string;
  activeProcessor: "stripe" | "square";
  enabledProcessors: PaymentProcessor[];
  enabledMethods: string[];
  zelleRecipient: string;
  zelleInstructions: string;
  holdMinutes: number;
  zelleVerificationHours: number;
  hourlyRate: number;
  squareEnvironment: "sandbox" | "production";
  paypalEnvironment: "sandbox" | "production";
  providerCredentials?: Partial<Record<PaymentCredentialKey, string>>;
} ): Promise<void> {
  await writeSetting( "bookingBufferMinutes", settings.bookingBufferMinutes );
  await writeSetting( "notificationTimezone", settings.notificationTimezone );
  await writeSetting( "appUrl", settings.appUrl );
  await writeSetting( "emailFromName", settings.emailFromName );
  await writeSetting( "emailFromAddress", settings.emailFromAddress );
  await writeSetting( "emailReplyTo", settings.emailReplyTo );
  await writeSetting( "priceByMileAirport", settings.priceByMileAirport );
  await writeSetting( "priceByMileCity", settings.priceByMileCity );
  await writeSetting( "priceByMileHourly", settings.priceByMileHourly );
  await writeSetting( "twilioFromNumber", settings.twilioFromNumber );
  await writeSetting( "activePaymentProcessor", settings.activeProcessor );
  await writeSetting( "enabledPaymentProcessors", settings.enabledProcessors.join( "," ) );
  await writeSetting( "enabledPaymentMethods", settings.enabledMethods.join( "," ) );
  await writeSetting( "zelleRecipient", settings.zelleRecipient );
  await writeSetting( "zelleInstructions", settings.zelleInstructions );
  await writeSetting( "paymentHoldMinutes", settings.holdMinutes );
  await writeSetting( "zelleVerificationHours", settings.zelleVerificationHours );
  await writeSetting( "hourlyRate", settings.hourlyRate );
  await writeSetting( "squareEnvironment", settings.squareEnvironment );
  await writeSetting( "paypalEnvironment", settings.paypalEnvironment );
  await Promise.all( Object.entries( settings.providerCredentials || {} ).map( ( [ key, value ] ) => savePaymentCredential( key as PaymentCredentialKey, value || "" ) ) );
}
