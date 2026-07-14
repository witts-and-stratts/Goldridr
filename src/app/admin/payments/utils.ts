import type { PaymentMethod } from "./types";

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatMethod(method: PaymentMethod): string {
  return { card: "Card", cash: "Cash", bank_transfer: "Bank transfer", other: "Other" }[method];
}
