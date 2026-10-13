import type { PaymentStatus } from "./types";

export const STATUS_OPTIONS: PaymentStatus[] = ["pending", "awaiting_verification", "paid", "refunded", "failed", "expired"];

// Partial refunds are only reached through the refund flow, so they can be filtered on but not set by hand.
export const FILTER_OPTIONS: PaymentStatus[] = ["pending", "awaiting_verification", "paid", "partially_refunded", "refunded", "failed", "expired"];
