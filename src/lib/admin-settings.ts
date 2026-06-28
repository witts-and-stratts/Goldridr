import { getAppSetting, setAppSetting } from "@/lib/db";

export const DEFAULT_NOTIFICATION_TIME_ZONE = "America/Chicago";
export const DEFAULT_APP_URL = "http://localhost:3000";
export const DEFAULT_EMAIL_FROM_NAME = "Goldridr";
export const DEFAULT_EMAIL_FROM_ADDRESS = "notifications@example.com";
export const DEFAULT_EMAIL_REPLY_TO = "support@example.com";
export const DEFAULT_PRICE_BY_MILE_AIRPORT = 5;
export const DEFAULT_PRICE_BY_MILE_CITY = 3;
export const DEFAULT_PRICE_BY_MILE_HOURLY = 4;
export const DEFAULT_TWILIO_FROM_NUMBER = "+10000000000";

async function readTextSetting( key: string, envName: string, fallback: string ): Promise<string> {
  try {
    const stored = ( await getAppSetting( key ) )?.trim();
    if ( stored ) return stored;
  } catch {}

  const envValue = process.env[ envName ]?.trim();
  return envValue || fallback;
}

async function readNumberSetting( key: string, envName: string, fallback: number ): Promise<number> {
  const raw = await readTextSetting( key, envName, String( fallback ) );
  const parsed = Number( raw );
  return Number.isFinite( parsed ) ? parsed : fallback;
}

async function writeSetting( key: string, value: string | number | undefined ): Promise<void> {
  if ( value === undefined || value === null ) return;
  await setAppSetting( key, String( value ) );
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

export async function getAdminSettings() {
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
}
