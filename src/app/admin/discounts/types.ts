export interface DiscountUsage {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  tripType: string;
  tripDate: string;
  tripTime: string;
  bookingStatus: string;
  originalAmountCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
  createdAt: string;
}

export interface DiscountCode {
  id: number;
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  active: number;
  maxRedemptions: number | null;
  redemptions: number;
  trackedRedemptions: number;
  totalDiscountCents: number;
  totalRevenueCents: number;
  expiresAt: string | null;
  createdAt: string;
  usages: DiscountUsage[];
}
