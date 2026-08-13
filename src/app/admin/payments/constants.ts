import type { PaymentStatus } from "./types";

export const STATUS_OPTIONS: PaymentStatus[] = ["pending", "awaiting_verification", "paid", "refunded", "failed", "expired"];
