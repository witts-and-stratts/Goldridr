import type { DiscountCode } from "./types";

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function isExpired(discount: DiscountCode) {
  return Boolean(discount.expiresAt && new Date(discount.expiresAt).getTime() <= Date.now());
}

export function discountStatus(discount: DiscountCode): "active" | "disabled" | "expired" | "exhausted" {
  if (!discount.active) return "disabled";
  if (isExpired(discount)) return "expired";
  if (discount.maxRedemptions !== null && discount.redemptions >= discount.maxRedemptions) return "exhausted";
  return "active";
}
