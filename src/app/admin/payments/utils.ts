import type { PaymentMethod } from "./types";

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatMethod(method: PaymentMethod): string {
  return { card: "Card", apple_pay: "Apple Pay", cash_app: "Cash App Pay", venmo: "Venmo", zelle: "Zelle", cash: "Cash", bank_transfer: "Bank transfer", other: "Other" }[method];
}
