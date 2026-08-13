export const PAYMENT_METHODS = [ "card", "apple_pay", "cash_app", "venmo", "zelle" ] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type PaymentProvider = "stripe" | "square" | "paypal" | "manual";
export type PaymentStatus = "pending" | "awaiting_verification" | "paid" | "failed" | "refunded" | "expired";

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
  paidAt: string | null;
  refundedAt: string | null;
}
