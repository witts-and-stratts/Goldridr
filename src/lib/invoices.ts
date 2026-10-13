import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAllBookings, getAllPayments, getBookingByReference, type BookingRecord, type PaymentRecord } from "@/lib/pocketbase/repository";
import { GoldridrPdfDocument } from "@/templates/pdf/goldridr-documents";
import { formatInvoiceDate } from "@/lib/documents/date";
import { invoiceStatus, type InvoiceStatus } from "@/lib/documents/invoice-status";
import { resolvePdfContent } from "@/lib/notifications/template-store";

export type { InvoiceStatus } from "@/lib/documents/invoice-status";
export interface Invoice { number: string; bookingReference: string; customerName: string; customerEmail: string; service: string; tripDate: string; amountCents: number; currency: string; status: InvoiceStatus; paymentId: number | null; issuedAt: string; }
const money = (cents: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
function invoiceFor(booking: BookingRecord, payments: PaymentRecord[]): Invoice {
  const payment = payments.filter(item => item.bookingReference === booking.reference).sort((a, b) => b.id - a.id)[0];
  const amountCents = booking.quoteTotalCents || payment?.amountCents || 0;
  const status: InvoiceStatus = invoiceStatus(booking.status, payment?.status);
  return { number: `INV-${booking.reference}`, bookingReference: booking.reference, customerName: booking.name, customerEmail: booking.email, service: booking.tripType, tripDate: booking.date, amountCents, currency: booking.quoteCurrency || payment?.currency || "USD", status, paymentId: payment?.id ?? null, issuedAt: booking.createdAt };
}
export async function getInvoices(): Promise<Invoice[]> { const [bookings, payments] = await Promise.all([getAllBookings(), getAllPayments()]); return bookings.filter(booking => (booking.quoteTotalCents || 0) > 0).map(booking => invoiceFor(booking, payments)); }
export async function getInvoice(reference: string): Promise<Invoice | undefined> { const [booking, payments] = await Promise.all([getBookingByReference(reference), getAllPayments()]); return booking && (booking.quoteTotalCents || 0) > 0 ? invoiceFor(booking, payments) : undefined; }

function introLines(value: string | undefined): Array<{ text: string; emphasis?: boolean }> {
  const lines = (value || "").split("\n").map(line => line.trim()).filter(Boolean);
  return lines.length ? [ ...lines.map(text => ({ text })), { text: "" } ] : [{ text: "" }];
}

export async function invoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const { content } = await resolvePdfContent("invoice", {
    bookingReference: invoice.bookingReference,
    passengerName: invoice.customerName,
    passengerEmail: invoice.customerEmail,
    number: invoice.number,
    id: invoice.paymentId ?? "",
  });
  const title = content.title?.trim() || `Invoice ${invoice.number}`;
  const footer = content.footer ?? "Thank you for choosing GoldRidr.";
  const lines: Array<{ text: string; emphasis?: boolean }> = [
    { text: "GoldRidr Chauffeur Services", emphasis: true },
    { text: `Issued: ${formatInvoiceDate(invoice.issuedAt)}` },
    ...introLines(content.intro),
    { text: `Bill to: ${invoice.customerName}`, emphasis: true },
    { text: invoice.customerEmail },
    { text: "" },
    { text: `Booking reference: ${invoice.bookingReference}` },
    { text: `Service: ${invoice.service.replaceAll("_", " ")}` },
    { text: `Trip date: ${formatInvoiceDate(invoice.tripDate)}` },
    { text: "" },
    { text: `Total: ${money(invoice.amountCents, invoice.currency)}`, emphasis: true },
    { text: `Status: ${invoice.status.toUpperCase()}` },
    ...(footer.trim() ? [{ text: footer }] : []),
  ];
  return new Uint8Array( await renderToBuffer( React.createElement( GoldridrPdfDocument, { title, lines } ) ) );
}

type PaymentPdfRecord = Pick<PaymentRecord, "id" | "amountCents" | "currency" | "status" | "method" | "transactionReference" | "paidAt">;

export async function paymentPdf(payment: PaymentPdfRecord, booking: BookingRecord): Promise<Uint8Array> {
  const { content } = await resolvePdfContent("payment", {
    bookingReference: booking.reference,
    passengerName: booking.name,
    passengerEmail: booking.email,
    id: payment.id,
    number: `PAY-${payment.id}`,
  });
  const title = content.title?.trim() || `Payment receipt #${payment.id}`;
  const footer = content.footer ?? "";
  const lines: Array<{ text: string; emphasis?: boolean }> = [
    { text: "GoldRidr Chauffeur Services", emphasis: true },
    { text: `Booking reference: ${booking.reference}` },
    ...introLines(content.intro),
    { text: `Customer: ${booking.name}` },
    { text: booking.email },
    { text: `Service: ${booking.tripType.replaceAll("_", " ")}` },
    { text: `Trip date: ${formatInvoiceDate(booking.date)}` },
    { text: "" },
    { text: `Amount: ${money(payment.amountCents, payment.currency)}`, emphasis: true },
    { text: `Payment status: ${payment.status.toUpperCase()}` },
    { text: `Method: ${payment.method.replaceAll("_", " ")}` },
    { text: `Transaction reference: ${payment.transactionReference || "—"}` },
    { text: `Paid: ${formatInvoiceDate(payment.paidAt)}` },
    ...(footer.trim() ? [{ text: footer }] : []),
  ];
  return new Uint8Array( await renderToBuffer( React.createElement( GoldridrPdfDocument, { title, lines } ) ) );
}

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
  tripDetails: JSON.stringify({ pickupLocation: "The Ritz-Carlton, 921 Canal St, New Orleans, LA", dropoffLocation: "Louis Armstrong New Orleans Intl (MSY)", terminal: "North Terminal", flightNumber: "UA 1533", passengers: "2", estimatedTotal: 185, durationHours: 3 }),
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

const SAMPLE_PAYMENT: PaymentPdfRecord = {
  id: 1042,
  amountCents: 18500,
  currency: "USD",
  status: "paid",
  method: "card",
  transactionReference: "ch_3PexampleTxnRef",
  paidAt: "2026-06-01T15:02:00.000Z",
};

export async function buildPdfPreview(id: string): Promise<Uint8Array | null> {
  if (id === "invoice") return invoicePdf(SAMPLE_INVOICE);
  if (id === "payment") return paymentPdf(SAMPLE_PAYMENT, SAMPLE_BOOKING);
  return null;
}
