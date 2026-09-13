import "server-only";
import { getAllBookings, getAllPayments, getBookingByReference, type BookingRecord, type PaymentRecord } from "@/lib/pocketbase/repository";
import { createDocumentPdf } from "@/lib/documents/pdf";
import { formatInvoiceDate } from "@/lib/documents/date";
import { invoiceStatus, type InvoiceStatus } from "@/lib/documents/invoice-status";

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
export function invoicePdf(invoice: Invoice): Uint8Array { return createDocumentPdf(`Invoice ${invoice.number}`, [{ text: "GoldRidr Chauffeur Services", emphasis: true }, { text: `Issued: ${formatInvoiceDate(invoice.issuedAt)}` }, { text: "" }, { text: `Bill to: ${invoice.customerName}`, emphasis: true }, { text: invoice.customerEmail }, { text: "" }, { text: `Booking reference: ${invoice.bookingReference}` }, { text: `Service: ${invoice.service.replaceAll("_", " ")}` }, { text: `Trip date: ${formatInvoiceDate(invoice.tripDate)}` }, { text: "" }, { text: `Total: ${money(invoice.amountCents, invoice.currency)}`, emphasis: true }, { text: `Status: ${invoice.status.toUpperCase()}` }, { text: "Thank you for choosing GoldRidr." }]); }
export function paymentPdf(payment: Pick<PaymentRecord, "id" | "amountCents" | "currency" | "status" | "method" | "transactionReference" | "paidAt">, booking: BookingRecord): Uint8Array { return createDocumentPdf(`Payment receipt #${payment.id}`, [{ text: "GoldRidr Chauffeur Services", emphasis: true }, { text: `Booking reference: ${booking.reference}` }, { text: "" }, { text: `Customer: ${booking.name}` }, { text: booking.email }, { text: `Service: ${booking.tripType.replaceAll("_", " ")}` }, { text: `Trip date: ${formatInvoiceDate(booking.date)}` }, { text: "" }, { text: `Amount: ${money(payment.amountCents, payment.currency)}`, emphasis: true }, { text: `Payment status: ${payment.status.toUpperCase()}` }, { text: `Method: ${payment.method.replaceAll("_", " ")}` }, { text: `Transaction reference: ${payment.transactionReference || "—"}` }, { text: `Paid: ${formatInvoiceDate(payment.paidAt)}` }]); }
