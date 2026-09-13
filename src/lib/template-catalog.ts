import "server-only";
import { invoicePdf, paymentPdf, type Invoice } from "@/lib/invoices";
import type { BookingRecord, PaymentRecord } from "@/lib/pocketbase/repository";

// Registry that powers the dev-only /admin/templates preview. When a new SMS or
// email template is added to the builders, add one entry here to make it visible.

export interface TemplatePreviewConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface PdfPreviewConfig {
  id: string;
  label: string;
  description: string;
}

const SAMPLE_TRIP_DETAILS = {
  pickupLocation: "The Ritz-Carlton, 921 Canal St, New Orleans, LA",
  dropoffLocation: "Louis Armstrong New Orleans Intl (MSY)",
  terminal: "North Terminal",
  flightNumber: "UA 1533",
  passengers: "2",
  estimatedTotal: 185,
  durationHours: 3,
};

const SAMPLE_PAYLOAD: Record<string, unknown> = {
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

function entry(
  id: string,
  name: string,
  label: string,
  description: string,
  payload: Record<string, unknown> = {}
): TemplatePreviewConfig {
  return { id, name, label, description, payload: { ...SAMPLE_PAYLOAD, ...payload } };
}

export const SMS_TEMPLATES: TemplatePreviewConfig[] = [
  entry( "sms-booking-created", "booking_created", "Booking created", "Sent when a booking request is received with a payment link." ),
  entry( "sms-payment-reminder", "payment_reminder", "Payment reminder", "Sent when a hold is close to expiring and payment is outstanding." ),
  entry( "sms-booking-reminder", "booking_reminder", "Booking reminder", "Timed reminder ahead of the scheduled pickup." ),
  entry( "sms-booking-assignment", "booking_assignment", "Chauffeur assigned", "Sent when a chauffeur is assigned to the booking." ),
  entry( "sms-booking-unassigned", "booking_assignment", "Awaiting chauffeur", "Variant sent when no chauffeur is assigned yet.", { chauffeurName: "" } ),
  entry( "sms-booking-deleted", "booking_deleted", "Booking deleted", "Sent when a booking is removed." ),
  entry( "sms-booking-status", "booking_status", "Status update", "Default update sent when a booking status changes.", { status: "in_progress" } ),
  entry( "sms-manual-message", "manual_message", "Manual message", "Free-form message composed by an administrator." ),
  entry( "sms-broadcast", "broadcast", "Broadcast", "Marketing or operational broadcast to many recipients." ),
];

export const EMAIL_TEMPLATES: TemplatePreviewConfig[] = [
  entry( "email-booking-created", "booking_created", "Booking created", "Confirmation of a received booking with a pay-to-confirm CTA and pickup PIN." ),
  entry( "email-booking-confirmed", "booking_status", "Booking confirmed", "Booking status email for a confirmed or accepted booking.", { status: "confirmed" } ),
  entry( "email-booking-status", "booking_status", "Status changed", "Booking status email for any non-confirmed status.", { status: "in_progress" } ),
  entry( "email-booking-assignment", "booking_assignment", "Chauffeur assigned", "Rider notification that a chauffeur was assigned or reassigned.", { action: "assigned" } ),
  entry( "email-booking-unassigned", "booking_assignment", "Assignment removed", "Rider notification that a chauffeur assignment was removed.", { action: "unassigned" } ),
  entry( "email-booking-deleted", "booking_deleted", "Booking deleted", "Rider notification that a booking record was removed." ),
  entry( "email-booking-reminder", "booking_reminder", "Booking reminder", "Timed pickup reminder for the rider." ),
  entry( "email-chauffeur-assignment", "chauffeur_assignment", "Chauffeur: assignment", "Sent to a chauffeur when a booking is assigned to them." ),
  entry( "email-chauffeur-unassigned", "chauffeur_unassigned", "Chauffeur: unassigned", "Sent to a chauffeur when a booking is reassigned away." ),
  entry( "email-chauffeur-reminder", "chauffeur_reminder", "Chauffeur: reminder", "Timed reminder for a chauffeur's upcoming assigned pickup." ),
  entry( "email-manual-message", "manual_message", "Manual message", "Free-form message composed by an administrator." ),
  entry( "email-broadcast", "broadcast", "Broadcast", "Marketing or operational broadcast to many recipients." ),
  entry( "email-delivery-failure", "delivery_failure", "Delivery failure", "Administrator alert when a notification moves to the dead letter queue.", { message: "Email delivery failed after 5 attempts: SMTP timeout." } ),
  entry( "email-default", "default", "Fallback", "Generic fallback used when no specific template matches." ),
];

export const PDF_TEMPLATES: PdfPreviewConfig[] = [
  { id: "invoice", label: "Invoice", description: "Booking invoice with totals and payment status." },
  { id: "payment", label: "Payment receipt", description: "Receipt issued after a successful payment." },
];

const SAMPLE_INVOICE: Invoice = {
  number: "INV-GR-7F3K2",
  bookingReference: "GR-7F3K2",
  customerName: "Amara Okafor",
  customerEmail: "amara@example.com",
  service: "airport",
  tripDate: "2026-06-14",
  amountCents: 18500,
  currency: "USD",
  status: "paid",
  paymentId: 1042,
  issuedAt: "2026-06-01T14:20:00.000Z",
};

const SAMPLE_BOOKING: BookingRecord = {
  id: 1,
  reference: "GR-7F3K2",
  tripType: "airport",
  date: "2026-06-14",
  time: "09:30",
  duration: 3,
  name: "Amara Okafor",
  email: "amara@example.com",
  phone: "+17135550123",
  notes: "Please meet at the valet entrance.",
  status: "confirmed",
  tripDetails: JSON.stringify( SAMPLE_TRIP_DETAILS ),
  chauffeurId: null,
  smsConsentVersion: "2026-08",
  smsConsentedAt: "2026-06-01T14:20:00.000Z",
  pin: "4821",
  pinConfirmedAt: null,
  paymentTokenHash: null,
  holdExpiresAt: null,
  quoteSubtotalCents: 18500,
  quoteDiscountCents: 0,
  quoteTotalCents: 18500,
  quoteCurrency: "USD",
  paymentConfirmedAt: "2026-06-01T15:02:00.000Z",
  createdAt: "2026-06-01T14:20:00.000Z",
};

const SAMPLE_PAYMENT: Pick<PaymentRecord, "id" | "amountCents" | "currency" | "status" | "method" | "transactionReference" | "paidAt"> = {
  id: 1042,
  amountCents: 18500,
  currency: "USD",
  status: "paid",
  method: "card",
  transactionReference: "ch_3PexampleTxnRef",
  paidAt: "2026-06-01T15:02:00.000Z",
};

export function buildPdfPreview( id: string ): Uint8Array | null {
  if ( id === "invoice" ) return invoicePdf( SAMPLE_INVOICE );
  if ( id === "payment" ) return paymentPdf( SAMPLE_PAYMENT, SAMPLE_BOOKING );
  return null;
}
