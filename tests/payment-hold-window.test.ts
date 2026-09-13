import assert from "node:assert/strict";
import test from "node:test";
import { extendedPaymentHoldExpiry } from "@/lib/payments/hold-window";

const now = new Date( "2026-09-13T10:00:00.000Z" );

test( "payment hold extensions add time to an active window", () => {
  assert.equal(
    extendedPaymentHoldExpiry( "2026-09-13T10:30:00.000Z", 45, now ),
    "2026-09-13T11:15:00.000Z",
  );
} );

test( "payment hold extensions restart from now when the prior window has elapsed", () => {
  assert.equal(
    extendedPaymentHoldExpiry( "2026-09-13T09:30:00.000Z", 45, now ),
    "2026-09-13T10:45:00.000Z",
  );
} );
