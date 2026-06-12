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

function readTextSetting( key: string, envName: string, fallback: string ): string {
  const stored = getAppSetting( key )?.trim();
  if ( stored ) return stored;

  const envValue = process.env[ envName ]?.trim();
  return envValue || fallback;
}

function readNumberSetting( key: string, envName: string, fallback: number ): number {
  const raw = readTextSetting( key, envName, String( fallback ) );
  const parsed = Number( raw );
  return Number.isFinite( parsed ) ? parsed : fallback;
}

function writeSetting( key: string, value: string | number | undefined ): void {
  if ( value === undefined || value === null ) return;
  setAppSetting( key, String( value ) );
}

export function getNotificationTimeZone(): string {
  return readTextSetting( "notificationTimezone", "NOTIFICATION_TIMEZONE", DEFAULT_NOTIFICATION_TIME_ZONE );
}

export function getAppUrl(): string {
  return readTextSetting( "appUrl", "APP_URL", DEFAULT_APP_URL );
}

export function getEmailFromName(): string {
  return readTextSetting( "emailFromName", "EMAIL_FROM_NAME", DEFAULT_EMAIL_FROM_NAME );
}

export function getEmailFromAddress(): string {
  return readTextSetting( "emailFromAddress", "EMAIL_FROM_ADDRESS", DEFAULT_EMAIL_FROM_ADDRESS );
}

export function getEmailReplyTo(): string | undefined {
  const value = readTextSetting( "emailReplyTo", "EMAIL_REPLY_TO", DEFAULT_EMAIL_REPLY_TO );
  return value || undefined;
}

export function getPriceByMileAirport(): number {
  return readNumberSetting( "priceByMileAirport", "PRICE_BY_MILE_AIRPORT", DEFAULT_PRICE_BY_MILE_AIRPORT );
}

export function getPriceByMileCity(): number {
  return readNumberSetting( "priceByMileCity", "PRICE_BY_MILE_CITY", DEFAULT_PRICE_BY_MILE_CITY );
}

export function getPriceByMileHourly(): number {
  return readNumberSetting( "priceByMileHourly", "PRICE_BY_MILE_HOURLY", DEFAULT_PRICE_BY_MILE_HOURLY );
}

export function getTwilioFromNumber(): string {
  return readTextSetting( "twilioFromNumber", "TWILIO_FROM_NUMBER", DEFAULT_TWILIO_FROM_NUMBER );
}

export function getAdminSettings() {
  return {
    bookingBufferMinutes: readNumberSetting( "bookingBufferMinutes", "", 30 ),
    notificationTimezone: getNotificationTimeZone(),
    appUrl: getAppUrl(),
    emailFromName: getEmailFromName(),
    emailFromAddress: getEmailFromAddress(),
    emailReplyTo: getEmailReplyTo() ?? "",
    priceByMileAirport: getPriceByMileAirport(),
    priceByMileCity: getPriceByMileCity(),
    priceByMileHourly: getPriceByMileHourly(),
    twilioFromNumber: getTwilioFromNumber(),
  };
}

export function saveAdminSettings( settings: {
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
} ): void {
  writeSetting( "bookingBufferMinutes", settings.bookingBufferMinutes );
  writeSetting( "notificationTimezone", settings.notificationTimezone );
  writeSetting( "appUrl", settings.appUrl );
  writeSetting( "emailFromName", settings.emailFromName );
  writeSetting( "emailFromAddress", settings.emailFromAddress );
  writeSetting( "emailReplyTo", settings.emailReplyTo );
  writeSetting( "priceByMileAirport", settings.priceByMileAirport );
  writeSetting( "priceByMileCity", settings.priceByMileCity );
  writeSetting( "priceByMileHourly", settings.priceByMileHourly );
  writeSetting( "twilioFromNumber", settings.twilioFromNumber );
}
