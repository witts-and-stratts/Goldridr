import { formatBookingStatus } from "@/lib/booking-status-label";
import { getBookingQrImageUrl, getBookingVerifyUrl } from "@/lib/booking-qr";
import { SMS_SUPPORT_EMAIL } from "@/lib/sms-consent-copy";

// Single canonical variable context shared by code defaults and admin overrides.
// Formatting lives here so email and SMS render from one source of truth.

export interface TemplateContext {
  booking: { reference: string; status: string; statusLabel: string };
  rider: { name: string; email: string; phone: string };
  trip: {
    type: string;
    serviceLabel: string;
    date: string;
    time: string;
    pickup: string;
    dropoff: string;
    passengers: string;
    flightNumber: string;
    terminal: string;
    duration: string;
    estimatedTotal: string;
    notes: string;
  };
  chauffeur: { name: string };
  links: { payment: string; booking: string; verify: string; qrImage: string };
  company: { name: string; supportEmail: string; appUrl: string };
  pin: string;
  reminderHours: string;
  message: string;
  subject: string;
  legacy: Record<string, string>;
}

export interface TemplateContextOptions {
  appUrl?: string;
  companyName?: string;
  supportEmail?: string;
}

const DEFAULT_COMPANY_NAME = "Goldridr";
const FALLBACK_APP_URL = process.env.APP_URL?.trim() || "http://localhost:3000";

export const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function stringValue( value: unknown ): string {
  if ( typeof value === "string" ) return value.trim();
  if ( typeof value === "number" ) return String( value );
  return "";
}

export function numberValue( value: unknown ): number | undefined {
  if ( typeof value === "number" && Number.isFinite( value ) ) return value;
  const parsed = Number( value );
  return Number.isFinite( parsed ) ? parsed : undefined;
}

export function formatBookingDate( value: unknown ): string {
  const date = stringValue( value );
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec( date );
  if ( !match ) return date;
  return new Intl.DateTimeFormat( "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  } ).format( new Date( Date.UTC( Number( match[ 1 ] ), Number( match[ 2 ] ) - 1, Number( match[ 3 ] ) ) ) );
}

export function formatBookingTime( value: unknown ): string {
  const time = stringValue( value );
  const match = /^(\d{1,2}):(\d{2})/.exec( time );
  if ( !match ) return time;
  const hours = Number( match[ 1 ] );
  return `${ hours % 12 || 12 }:${ match[ 2 ] } ${ hours >= 12 ? "PM" : "AM" }`;
}

export function formatCurrency( value: unknown ): string {
  const amount = numberValue( value );
  if ( amount === undefined ) return "";
  return new Intl.NumberFormat( "en-US", { style: "currency", currency: "USD" } ).format( amount );
}

export function tripTypeLabel( value: unknown ): string {
  switch ( stringValue( value ).toLowerCase() ) {
    case "airport":
      return "Airport transfer";
    case "hourly":
      return "Hourly service";
    case "city":
    case "town":
      return "Around town";
    default:
      return stringValue( value ) || "Chauffeur service";
  }
}

export function tripDurationLabel( payload: Record<string, unknown> ): string {
  const tripDetails = payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
  const isHourly = stringValue( payload.tripType ).toLowerCase() === "hourly";
  if ( !isHourly ) return "";
  const durationMinutes = numberValue( payload.duration );
  const hours = numberValue( tripDetails.durationHours )
    ?? numberValue( tripDetails.duration )
    ?? ( durationMinutes ? durationMinutes / 60 : undefined );
  if ( !hours ) return "";
  return `${ hours } ${ hours === 1 ? "hour" : "hours" }`;
}

function tripDetailsOf( payload: Record<string, unknown> ): Record<string, unknown> {
  return payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
}

export function buildTemplateContext(
  payload: Record<string, unknown>,
  options: TemplateContextOptions = {}
): TemplateContext {
  const tripDetails = tripDetailsOf( payload );
  const reference = stringValue( payload.bookingReference );
  const status = stringValue( payload.status );
  const appUrl = ( options.appUrl || stringValue( payload.appUrl ) || FALLBACK_APP_URL ).replace( /\/$/, "" );
  const email = stringValue( payload.passengerEmail );
  const date = formatBookingDate( payload.date );
  const time = formatBookingTime( payload.time );
  const serviceLabel = tripTypeLabel( payload.tripType );
  const statusLabel = status ? formatBookingStatus( status ) : "";
  const pickup = stringValue( tripDetails.pickupLocation || tripDetails.pickup );
  const dropoff = stringValue( tripDetails.dropoffLocation || tripDetails.destination );
  const passengers = stringValue( tripDetails.passengers );
  const flightNumber = stringValue( tripDetails.flightNumber );
  const terminal = stringValue( tripDetails.terminal );
  const duration = tripDurationLabel( payload );
  const estimatedTotal = formatCurrency( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice );
  const notes = stringValue( payload.notes );
  const passengerName = stringValue( payload.passengerName );
  const chauffeurName = stringValue( payload.chauffeurName );
  const paymentUrl = stringValue( payload.paymentUrl );
  const pin = stringValue( payload.pin );
  const reminderHours = stringValue( payload.reminderHours );
  const messageValue = stringValue( payload.message );
  const subjectValue = stringValue( payload.subject );

  const legacy: Record<string, string> = {
    bookingReference: reference,
    passengerName,
    passengerEmail: email,
    passengerPhone: stringValue( payload.passengerPhone ),
    date,
    time,
    tripType: stringValue( payload.tripType ),
    status,
    statusLabel,
    chauffeurName,
    pin,
    reminderHours,
    message: messageValue,
    subject: subjectValue,
    paymentUrl,
    appUrl,
    "tripDetails.pickupLocation": pickup,
    "tripDetails.dropoffLocation": dropoff,
    "tripDetails.flightNumber": flightNumber,
    "tripDetails.terminal": terminal,
    "tripDetails.passengers": passengers,
    "tripDetails.estimatedTotal": estimatedTotal,
    "tripDetails.durationHours": stringValue( tripDetails.durationHours ),
  };

  return {
    booking: { reference, status, statusLabel },
    rider: { name: passengerName, email, phone: stringValue( payload.passengerPhone ) },
    trip: { type: stringValue( payload.tripType ), serviceLabel, date, time, pickup, dropoff, passengers, flightNumber, terminal, duration, estimatedTotal, notes },
    chauffeur: { name: chauffeurName },
    links: {
      payment: paymentUrl,
      booking: `${ appUrl }/admin/bookings`,
      verify: reference && email ? getBookingVerifyUrl( appUrl, reference, email ) : "",
      qrImage: reference && email ? getBookingQrImageUrl( appUrl, reference, email ) : "",
    },
    company: {
      name: options.companyName || DEFAULT_COMPANY_NAME,
      supportEmail: options.supportEmail || SMS_SUPPORT_EMAIL,
      appUrl,
    },
    pin,
    reminderHours,
    message: messageValue,
    subject: subjectValue,
    legacy,
  };
}

export function buildVariableLookup( context: TemplateContext ): Record<string, string> {
  const lookup: Record<string, string> = {};
  const walk = ( value: unknown, prefix: string ) => {
    if ( value && typeof value === "object" && !Array.isArray( value ) ) {
      for ( const [ key, nested ] of Object.entries( value as Record<string, unknown> ) ) {
        if ( key === "legacy" ) continue;
        walk( nested, prefix ? `${ prefix }.${ key }` : key );
      }
      return;
    }
    if ( prefix ) lookup[ prefix ] = value == null ? "" : String( value );
  };
  walk( context, "" );
  for ( const [ key, value ] of Object.entries( context.legacy ) ) {
    if ( !( key in lookup ) ) lookup[ key ] = value;
  }
  return lookup;
}

export function renderTemplate( template: string, context: TemplateContext ): string {
  const lookup = buildVariableLookup( context );
  return template.replace( TEMPLATE_VARIABLE_PATTERN, ( _match, name: string ) => {
    if ( Object.prototype.hasOwnProperty.call( lookup, name ) ) return lookup[ name ];
    console.warn( `[templates] Unknown variable {{ ${ name } }}` );
    return "";
  } );
}

export function renderHtmlTemplate( template: string, context: TemplateContext ): string {
  const lookup = buildVariableLookup( context );
  return template.replace( TEMPLATE_VARIABLE_PATTERN, ( _match, name: string ) => {
    if ( !Object.prototype.hasOwnProperty.call( lookup, name ) ) {
      console.warn( `[templates] Unknown variable {{ ${ name } }}` );
      return "";
    }
    return String( lookup[ name ] )
      .replaceAll( "&", "&amp;" )
      .replaceAll( "<", "&lt;" )
      .replaceAll( ">", "&gt;" )
      .replaceAll( '"', "&quot;" )
      .replaceAll( "'", "&#39;" );
  } );
}

export function extractVariables( template: string ): string[] {
  const found = new Set<string>();
  for ( const match of template.matchAll( TEMPLATE_VARIABLE_PATTERN ) ) found.add( match[ 1 ] );
  return [ ...found ];
}
