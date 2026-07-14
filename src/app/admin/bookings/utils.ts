import { CHAUFFEUR_COLORS } from "./constants";

export const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export function chauffeurInitials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function chauffeurColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return CHAUFFEUR_COLORS[Math.abs(hash) % CHAUFFEUR_COLORS.length];
}
