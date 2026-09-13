import assert from "node:assert/strict";
import test from "node:test";
import { formatInvoiceDate } from "@/lib/documents/date";
import { invoiceStatus } from "@/lib/documents/invoice-status";

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
});
