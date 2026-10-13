export type InvoiceStatus = "open" | "paid" | "partially_refunded" | "expired" | "void" | "refunded";

export function invoiceStatus(bookingStatus: string, paymentStatus?: string | null): InvoiceStatus {
  if (paymentStatus === "refunded") return "refunded";
  if (paymentStatus === "partially_refunded") return "partially_refunded";
  if (["cancelled", "rejected"].includes(bookingStatus)) return "void";
  if (bookingStatus === "payment_expired" || paymentStatus === "expired") return "expired";
  if (paymentStatus === "paid") return "paid";
  return "open";
}
