import type { BookingRecord, PaymentRecord } from "@/lib/pocketbase/repository";
import { bookingCharges, isLegActive, legLabel, rideView } from "@/lib/booking-legs";
import { formatInvoiceDate } from "@/lib/documents/date";

export type DocumentLine = { text: string; emphasis?: boolean; amount?: string; detail?: string };
export type RefundSource = Pick<PaymentRecord, "refundedCents" | "refunds">;

export const money = (cents: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
const credit = (cents: number, currency: string) => `−${money(cents, currency)}`;

function tripRoute(tripDetails: string): string {
  try {
    const details = JSON.parse(tripDetails || "{}") as Record<string, unknown>;
    const pickup = String(details.pickupLocation || details.pickup || "").trim();
    const dropoff = String(details.dropoffLocation || details.destination || "").trim();
    return [pickup, dropoff].filter(Boolean).join(" → ");
  } catch {
    return "";
  }
}

function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || "");
  if (!match) return "";
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}

/**
 * Priced lines shared by the invoice and the payment receipt: each leg at its own
 * price, the discounts that brought it to the total, and any refunds since.
 */
export function chargeLines(booking: BookingRecord, currency: string, refunds?: RefundSource): DocumentLine[] {
  const charges = bookingCharges(booking);
  const roundTrip = Boolean(booking.returnLeg);
  const lines: DocumentLine[] = charges.legs.map(item => {
    const ride = rideView(booking, item.leg)!;
    const when = [formatInvoiceDate(ride.date), formatTime(ride.time)].filter(part => part && part !== "—").join(" at ");
    const cancelled = roundTrip && !isLegActive(booking, item.leg) ? " (cancelled)" : "";
    const label = roundTrip ? `${legLabel(item.leg)} leg${cancelled}` : `${booking.tripType.replaceAll("_", " ")} service`;
    return { text: label, detail: [when, tripRoute(ride.tripDetails)].filter(Boolean).join(" · "), amount: money(item.listCents, currency) };
  });
  if (charges.roundTripDiscountCents || charges.codeDiscountCents || charges.adjustmentCents) lines.push({ text: "Subtotal", amount: money(charges.subtotalCents, currency) });
  if (charges.roundTripDiscountCents) lines.push({ text: `Round trip discount${charges.roundTripDiscountPercent ? ` (${charges.roundTripDiscountPercent}%)` : ""}`, amount: credit(charges.roundTripDiscountCents, currency) });
  if (charges.codeDiscountCents) {
    const code = (() => { try { return String(JSON.parse(booking.tripDetails || "{}").discountCode || ""); } catch { return ""; } })();
    lines.push({ text: code ? `Discount code ${code}` : "Discount code", amount: credit(charges.codeDiscountCents, currency) });
  }
  if (charges.adjustmentCents) lines.push({ text: "Price adjustment", amount: charges.adjustmentCents < 0 ? credit(-charges.adjustmentCents, currency) : money(charges.adjustmentCents, currency) });
  lines.push({ text: "Total", amount: money(charges.totalCents, currency), emphasis: true });
  if (roundTrip && (charges.roundTripDiscountCents || charges.codeDiscountCents || charges.adjustmentCents)) {
    lines.push({ text: `Charged per leg: ${charges.legs.map(item => `${legLabel(item.leg).toLowerCase()} ${money(item.chargedCents, currency)}`).join(", ")}`, detail: "Discounts are shared between the legs in proportion to their prices." });
  }
  for (const refund of refunds?.refunds ?? []) {
    const legs = refund.legs.length ? ` (${refund.legs.map(leg => `${leg} leg`).join(" and ")})` : "";
    lines.push({ text: `Refund${legs}`, detail: formatInvoiceDate(refund.refundedAt), amount: credit(refund.amountCents, currency) });
  }
  if (refunds?.refundedCents) lines.push({ text: "Net paid after refunds", amount: money(Math.max(0, charges.totalCents - refunds.refundedCents), currency), emphasis: true });
  return lines;
}

