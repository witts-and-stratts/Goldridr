import assert from "node:assert/strict";
import test from "node:test";
import { formatInvoiceDate } from "@/lib/documents/date";
import { invoiceStatus } from "@/lib/documents/invoice-status";
import { chargeLines } from "@/lib/documents/charge-lines";
import type { BookingRecord } from "@/lib/pocketbase/repository";

test("formats date-only and ISO invoice timestamps safely", () => {
  assert.equal(formatInvoiceDate("2026-09-13"), "Sep 13, 2026");
  assert.equal(formatInvoiceDate("2026-09-13T18:42:10.000Z"), "Sep 13, 2026");
  assert.equal(formatInvoiceDate("not-a-date"), "—");
});

test("keeps invoice obligation states separate from payment attempts", () => {
  assert.equal(invoiceStatus("pending_payment", "pending"), "open");
  assert.equal(invoiceStatus("payment_expired", "expired"), "expired");
  assert.equal(invoiceStatus("cancelled", "pending"), "void");
  assert.equal(invoiceStatus("confirmed", "paid"), "paid");
  assert.equal(invoiceStatus("cancelled", "refunded"), "refunded");
  assert.equal(invoiceStatus("confirmed", "partially_refunded"), "partially_refunded");
});

const roundTrip: BookingRecord = {
  id: 1,
  reference: "GR-ABCD1234",
  tripType: "airport",
  date: "2099-06-11",
  time: "13:00",
  duration: 45,
  name: "Rider",
  email: "rider@example.com",
  phone: "",
  notes: "",
  status: "confirmed",
  tripDetails: JSON.stringify({ pickupLocation: "Home", dropoffLocation: "IAH", roundTrip: { leg: "outbound", outboundCents: 10000, returnCents: 10000, discountPercent: 10, discountCents: 2000 } }),
  quoteSubtotalCents: 18000,
  quoteDiscountCents: 0,
  quoteTotalCents: 18000,
  createdAt: "2099-01-01T00:00:00.000Z",
  returnLeg: { date: "2099-06-14", time: "18:00", duration: 45, chauffeurId: null, tripDetails: JSON.stringify({ pickupLocation: "IAH", dropoffLocation: "Home" }), status: "cancelled", pinConfirmedAt: null },
};

test("invoice lines price each leg and show the round trip discount and refunds", () => {
  const lines = chargeLines(roundTrip, "USD", { refundedCents: 9000, refunds: [{ reference: "re_1", amountCents: 9000, legs: ["return"], refundedAt: "2099-06-01T00:00:00.000Z" }] });
  const priced = lines.filter(line => line.amount !== undefined).map(line => [line.text, line.amount]);
  assert.deepEqual(priced, [
    ["Outbound leg", "$100.00"],
    ["Return leg (cancelled)", "$100.00"],
    ["Subtotal", "$200.00"],
    ["Round trip discount (10%)", "−$20.00"],
    ["Total", "$180.00"],
    ["Refund (return leg)", "−$90.00"],
    ["Net paid after refunds", "$90.00"],
  ]);
  assert.match(lines[0].detail ?? "", /Jun 11, 2099 at 1:00 PM · Home → IAH/);
});

test("one-way invoices keep a single service line", () => {
  const lines = chargeLines({ ...roundTrip, tripDetails: "{}", returnLeg: null, quoteTotalCents: 5000, quoteSubtotalCents: 5000 }, "USD");
  assert.deepEqual(lines.filter(line => line.amount !== undefined).map(line => [line.text, line.amount]), [["airport service", "$50.00"], ["Total", "$50.00"]]);
});
