export const PAYMENT_METHODS = [ "card", "apple_pay", "cash_app", "venmo", "zelle" ] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type PaymentProvider = "stripe" | "paypal" | "manual";
import type { BookingLeg } from "@/lib/booking-legs";

export type PaymentStatus = "pending" | "awaiting_verification" | "paid" | "partially_refunded" | "failed" | "refunded" | "expired";

export interface PaymentRefund {
  reference: string;
  amountCents: number;
  /** Legs cancelled by this refund; empty for a goodwill refund that keeps the trip. */
  legs: BookingLeg[];
  refundedAt: string;
}

export interface PaymentAttempt {
  id: number;
  bookingReference: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  externalId: string | null;
  transactionReference: string | null;
  idempotencyKey: string | null;
  senderName: string | null;
  confirmationReference: string | null;
  verificationExpiresAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  walletType: string | null;
  receiptUrl: string | null;
  providerMetadata: unknown;
  paidAt: string | null;
  refundedAt: string | null;
  refundedCents: number;
  refunds: PaymentRefund[];
}
