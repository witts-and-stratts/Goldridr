export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "card" | "cash" | "bank_transfer" | "other";

export interface Payment {
  id: number;
  bookingReference: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
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
