export type PaymentStatus = "pending" | "awaiting_verification" | "paid" | "partially_refunded" | "refunded" | "failed" | "expired";

export interface PaymentLeg {
  leg: "outbound" | "return";
  chargedCents: number;
  date: string;
  time: string;
  active: boolean;
}

export interface PaymentRefund {
  reference: string;
  amountCents: number;
  legs: Array<"outbound" | "return">;
  refundedAt: string;
}
export type PaymentMethod = "card" | "apple_pay" | "cash_app" | "venmo" | "zelle" | "cash" | "bank_transfer" | "other";

export interface Payment {
  id: number;
  bookingReference: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  provider: "stripe" | "paypal" | "manual";
  status: PaymentStatus;
  transactionReference: string | null;
  externalId: string | null;
  idempotencyKey: string | null;
  failureCode: string | null;
  senderName: string | null;
  confirmationReference: string | null;
  verificationExpiresAt: string | null;
  refundedAt: string | null;
  refundedCents: number;
  refunds: PaymentRefund[];
  /** Per-leg charges for round trips; empty for one-way bookings. */
  legs: PaymentLeg[];
  failureMessage: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  walletType: string | null;
  receiptUrl: string | null;
  providerMetadata: unknown;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  tripType: string;
  tripDate: string;
  tripTime: string;
  bookingStatus: string;
}

export interface PaymentBooking {
  reference: string;
  name: string;
  email: string;
  status: string;
  date: string;
  time: string;
  tripDetails: { estimatedTotal?: number; estimatedPrice?: number };
}
