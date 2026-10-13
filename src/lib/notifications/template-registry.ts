import { emailDefaultContent as buildEmailDefault, emailVariant, isConfirmedStatus } from "@/templates/email/defaults";
import { smsDefaultContent, smsDefaultEditorContent } from "@/lib/notifications/sms-program";
import { stringValue } from "@/lib/notifications/template-context";
import type {
  EmailEditableContent,
  PdfContent,
  SmsContent,
  TemplateChannel,
  TemplateContent,
  TemplateField,
} from "@/lib/notifications/template-types";

export type { TemplateField } from "@/lib/notifications/template-types";

export interface TemplateRegistryEntry {
  templateId: string;
  channel: TemplateChannel;
  key: string;
  variant: string;
  label: string;
  description: string;
  adminEditable: boolean;
  complianceManaged: boolean;
  fields: TemplateField[];
  allowedVariables: string[];
  defaultContent: ( payload: Record<string, unknown> ) => TemplateContent;
  defaultEditorContent?: ( payload: Record<string, unknown> ) => TemplateContent;
  samplePayload: Record<string, unknown>;
}

export const SMS_ALLOWED_VARIABLES = [
  "booking.reference",
  "booking.status",
  "booking.statusLabel",
  "rider.name",
  "trip.date",
  "trip.time",
  "trip.terminal",
  "trip.pickup",
  "trip.dropoff",
  "chauffeur.name",
  "links.payment",
  "company.name",
  "company.supportEmail",
];

export const EMAIL_ALLOWED_VARIABLES = [
  "booking.reference",
  "booking.status",
  "booking.statusLabel",
  "rider.name",
  "rider.email",
  "trip.serviceLabel",
  "trip.date",
  "trip.time",
  "trip.pickup",
  "trip.dropoff",
  "trip.passengers",
  "trip.flightNumber",
  "trip.terminal",
  "trip.duration",
  "trip.estimatedTotal",
  "trip.notes",
  "chauffeur.name",
  "pin",
  "reminderHours",
  "message",
  "subject",
  "links.payment",
  "links.booking",
  "links.verify",
  "links.qrImage",
  "company.name",
  "company.supportEmail",
  "company.appUrl",
];

export const PDF_ALLOWED_VARIABLES = [
  "booking.reference",
  "rider.name",
  "rider.email",
  "trip.serviceLabel",
  "trip.date",
  "company.name",
  "company.supportEmail",
];

function smsAllowedVariables( templateId: string ): string[] {
  const base = templateId.split( ":" )[ 0 ];
  if ( base === "booking_created" ) return [ "booking.reference", "trip.date", "trip.time", "trip.terminal", "links.payment", "company.name" ];
  if ( base === "payment_reminder" ) return [ "booking.reference", "links.payment", "company.name" ];
  if ( base === "booking_reminder" ) return [ "booking.reference", "trip.date", "trip.time", "trip.terminal", "company.name" ];
  if ( base === "booking_assignment" ) return [ "booking.reference", "chauffeur.name", "trip.terminal", "company.name" ];
  if ( base === "booking_deleted" ) return [ "booking.reference", "trip.terminal", "company.name" ];
  return [ "booking.reference", "booking.statusLabel", "trip.terminal", "company.name" ];
}

function emailAllowedVariables( templateId: string ): string[] {
  const base = templateId.split( ":" )[ 0 ];
  if ( base === "booking_created" ) return [ "booking.reference", "rider.name", "pin", "links.payment", "company.name", "company.supportEmail", "trip.serviceLabel", "trip.date", "trip.time", "trip.pickup", "trip.dropoff", "trip.passengers", "trip.flightNumber", "trip.terminal", "trip.notes" ];
  if ( base === "delivery_failure" ) return [ "message", "links.booking", "company.name", "company.supportEmail" ];
  if ( base === "default" ) return [ "subject", "message", "company.name", "company.supportEmail" ];
  const common = [ "booking.reference", "booking.statusLabel", "rider.name", "trip.serviceLabel", "trip.date", "trip.time", "trip.pickup", "trip.dropoff", "trip.passengers", "trip.flightNumber", "trip.terminal", "trip.duration", "trip.estimatedTotal", "trip.notes", "chauffeur.name", "reminderHours", "company.name", "company.supportEmail" ];
  return [ "chauffeur_assignment", "chauffeur_reminder" ].includes( base ) ? [ ...common, "links.booking" ] : common;
}

export const SMS_FIELDS: TemplateField[] = [
  { name: "body", label: "Message", multiline: true, required: true, maxLength: 1500 },
];

export const EMAIL_FIELDS: TemplateField[] = [
  { name: "subject", label: "Subject", required: true, maxLength: 200 },
  { name: "preview", label: "Preview text", maxLength: 200 },
  { name: "heading", label: "Heading", maxLength: 200 },
  { name: "message", label: "Message", multiline: true, required: true, maxLength: 4000 },
  { name: "ctaLabel", label: "Button label", maxLength: 80 },
  { name: "footerNote", label: "Footer note", multiline: true, maxLength: 500 },
];

export const PDF_FIELDS: TemplateField[] = [
  { name: "title", label: "Document title", maxLength: 160 },
  { name: "intro", label: "Intro line", multiline: true, maxLength: 500 },
  { name: "footer", label: "Footer line", multiline: true, maxLength: 500 },
];

const SAMPLE_TRIP_DETAILS = {
  pickupLocation: "The Ritz-Carlton, 921 Canal St, New Orleans, LA",
  dropoffLocation: "Louis Armstrong New Orleans Intl (MSY)",
  terminal: "North Terminal",
  flightNumber: "UA 1533",
  passengers: "2",
  estimatedTotal: 185,
  durationHours: 3,
};

export const SAMPLE_PAYLOAD: Record<string, unknown> = {
  bookingReference: "GR-7F3K2",
  passengerName: "Amara Okafor",
  passengerEmail: "amara@example.com",
  passengerPhone: "+17135550123",
  date: "2026-06-14",
  time: "09:30",
  tripType: "airport",
  status: "confirmed",
  paymentUrl: "https://app.goldridr.com/pay/sample-token",
  appUrl: "https://app.goldridr.com",
  reminderHours: "24",
  chauffeurName: "Marcus Bell",
  action: "assigned",
  pin: "4821",
  subject: "Your GoldRidr ride update",
  message: "Your chauffeur will arrive 15 minutes early. Please be ready in the lobby.",
  notes: "Please meet at the valet entrance.",
  tripDetails: SAMPLE_TRIP_DETAILS,
};

const SAMPLE_INVOICE: Record<string, unknown> = {
  number: "INV-GR-7F3K2",
  bookingReference: "GR-7F3K2",
  customerName: "Amara Okafor",
};

const SAMPLE_PAYMENT: Record<string, unknown> = {
  id: 1042,
  bookingReference: "GR-7F3K2",
  customerName: "Amara Okafor",
};

function sample( overrides: Record<string, unknown> = {} ): Record<string, unknown> {
  return { ...SAMPLE_PAYLOAD, ...overrides };
}

function smsEntry(
  templateId: string,
  label: string,
  description: string,
  payloadOverrides: Record<string, unknown> = {}
): TemplateRegistryEntry {
  const variant = templateId.includes( ":" ) ? templateId.split( ":" ).slice( 1 ).join( ":" ) : "";
  return {
    templateId,
    channel: "sms",
    key: templateId.split( ":" )[ 0 ],
    variant,
    label,
    description,
    adminEditable: true,
    complianceManaged: true,
    fields: SMS_FIELDS,
    allowedVariables: smsAllowedVariables( templateId ),
    defaultContent: ( payload ) => smsDefaultContent( templateId, payload ),
    defaultEditorContent: ( payload ) => smsDefaultEditorContent( templateId, payload ),
    samplePayload: sample( payloadOverrides ),
  };
}

function emailEntry(
  templateId: string,
  label: string,
  description: string,
  payloadOverrides: Record<string, unknown> = {}
): TemplateRegistryEntry {
  const variant = emailVariant( templateId );
  return {
    templateId,
    channel: "email",
    key: templateId.split( ":" )[ 0 ],
    variant,
    label,
    description,
    adminEditable: true,
    complianceManaged: false,
    fields: EMAIL_FIELDS,
    allowedVariables: emailAllowedVariables( templateId ),
    defaultContent: ( payload ) => buildEmailDefault( templateId, payload ),
    defaultEditorContent: ( payload ) => buildEmailDefault( templateId, payload ),
    samplePayload: sample( payloadOverrides ),
  };
}

function pdfEntry(
  templateId: string,
  label: string,
  description: string,
  defaultContent: ( payload: Record<string, unknown> ) => PdfContent,
  samplePayload: Record<string, unknown>
): TemplateRegistryEntry {
  return {
    templateId,
    channel: "pdf",
    key: templateId,
    variant: "",
    label,
    description,
    adminEditable: false,
    complianceManaged: false,
    fields: PDF_FIELDS,
    allowedVariables: PDF_ALLOWED_VARIABLES,
    defaultContent,
    defaultEditorContent: defaultContent,
    samplePayload,
  };
}

export const TEMPLATE_REGISTRY: TemplateRegistryEntry[] = [
  // SMS
  smsEntry( "booking_created", "Booking created", "Sent when a booking request is received with a payment link." ),
  smsEntry( "payment_reminder", "Payment reminder", "Sent when a hold is close to expiring and payment is outstanding." ),
  smsEntry( "booking_reminder", "Booking reminder", "Timed reminder ahead of the scheduled pickup." ),
  smsEntry( "booking_assignment:assigned", "Chauffeur assigned", "Sent when a chauffeur is assigned to the booking." ),
  smsEntry( "booking_assignment:unassigned", "Awaiting chauffeur", "Sent when no chauffeur is assigned yet.", { chauffeurName: "" } ),
  smsEntry( "booking_deleted", "Booking deleted", "Sent when a booking is removed." ),
  smsEntry( "booking_status:confirmed", "Booking confirmed", "Sent when a booking is confirmed or accepted.", { status: "confirmed" } ),
  smsEntry( "booking_status:updated", "Status update", "Sent when a booking status changes.", { status: "in_progress" } ),
  // Email
  emailEntry( "booking_created", "Booking created", "Confirmation of a received booking with a pay-to-confirm CTA and pickup PIN." ),
  emailEntry( "booking_status:confirmed", "Booking confirmed", "Booking status email for a confirmed or accepted booking.", { status: "confirmed" } ),
  emailEntry( "booking_status:updated", "Status changed", "Booking status email for any non-confirmed status.", { status: "in_progress" } ),
  emailEntry( "booking_assignment:assigned", "Chauffeur assigned", "Rider notification that a chauffeur was assigned or reassigned.", { action: "assigned" } ),
  emailEntry( "booking_assignment:unassigned", "Assignment removed", "Rider notification that a chauffeur assignment was removed.", { action: "unassigned" } ),
  emailEntry( "booking_deleted", "Booking deleted", "Rider notification that a booking record was removed." ),
  emailEntry( "booking_reminder", "Booking reminder", "Timed pickup reminder for the rider." ),
  emailEntry( "chauffeur_assignment", "Chauffeur: assignment", "Sent to a chauffeur when a booking is assigned to them." ),
  emailEntry( "chauffeur_unassigned", "Chauffeur: unassigned", "Sent to a chauffeur when a booking is reassigned away." ),
  emailEntry( "chauffeur_reminder", "Chauffeur: reminder", "Timed reminder for a chauffeur's upcoming assigned pickup." ),
  emailEntry( "delivery_failure", "Delivery failure", "Administrator alert when a notification moves to the dead letter queue.", { message: "Email delivery failed after 5 attempts: SMTP timeout." } ),
  emailEntry( "default", "Fallback", "Generic fallback used when no specific template matches." ),
  // PDF
  pdfEntry(
    "invoice",
    "Invoice",
    "Booking invoice with totals and payment status.",
    ( payload ) => ( { title: `Invoice ${ stringValue( payload.number ) }`.trim(), intro: "", footer: "Thank you for choosing GoldRidr." } ),
    SAMPLE_INVOICE
  ),
  pdfEntry(
    "payment",
    "Payment receipt",
    "Receipt issued after a successful payment.",
    ( payload ) => ( { title: `Payment receipt #${ stringValue( payload.id ) }`.trim(), intro: "", footer: "" } ),
    SAMPLE_PAYMENT
  ),
];

export const TEMPLATE_ENTRY_MAP = new Map(
  TEMPLATE_REGISTRY.map( entry => [ `${ entry.channel }:${ entry.templateId }`, entry ] )
);

type VariantSelector = ( payload: Record<string, unknown> ) => string;

const VARIANT_SELECTORS: Record<string, VariantSelector> = {
  "sms:booking_status": payload => ( isConfirmedStatus( stringValue( payload.status ) ) ? "confirmed" : "updated" ),
  "email:booking_status": payload => ( isConfirmedStatus( stringValue( payload.status ) ) ? "confirmed" : "updated" ),
  "sms:booking_assignment": payload => ( stringValue( payload.chauffeurName ) ? "assigned" : "unassigned" ),
  "email:booking_assignment": payload =>
    [ "assigned", "reassigned" ].includes( stringValue( payload.action ) ) ? "assigned" : "unassigned",
};

export function getRegistryEntry(
  channel: TemplateChannel,
  templateId: string
): TemplateRegistryEntry | undefined {
  return TEMPLATE_ENTRY_MAP.get( `${ channel }:${ templateId }` );
}

export function resolveTemplateIdentity(
  channel: TemplateChannel,
  key: string,
  payload: Record<string, unknown>
): { entry: TemplateRegistryEntry; variant: string } | null {
  const selector = VARIANT_SELECTORS[ `${ channel }:${ key }` ];
  const variant = selector ? selector( payload ) : "";
  const templateId = variant ? `${ key }:${ variant }` : key;
  const entry = getRegistryEntry( channel, templateId );
  return entry ? { entry, variant } : null;
}

export function listRegistryEntries(): TemplateRegistryEntry[] {
  return TEMPLATE_REGISTRY;
}

export function listAvailableVariables( channel: TemplateChannel, templateId: string ): string[] {
  return getRegistryEntry( channel, templateId )?.allowedVariables || [];
}

export function defaultTemplateContent(
  channel: TemplateChannel,
  templateId: string,
  payload: Record<string, unknown>
): TemplateContent {
  const entry = getRegistryEntry( channel, templateId );
  if ( !entry ) return channel === "sms" ? ( { body: "" } satisfies SmsContent ) : ( {} as EmailEditableContent );
  return entry.defaultContent( payload );
}
