import type { Booking } from "./types";

export const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export function getStats(bookings: Booking[], id: string) {
  const assigned = bookings.filter((b) => b.chauffeurId === id);
  const confirmed = assigned.filter((b) => b.status === "confirmed" || b.status === "accepted");
  const pending = assigned.filter((b) => b.status === "pending");
  const revenue = confirmed.reduce(
    (sum, b) => sum + (b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0),
    0,
  );
  const upcoming = assigned.filter((b) => {
    const d = new Date(`${b.date}T00:00:00`);
    return d >= new Date() && (b.status === "confirmed" || b.status === "accepted");
  });
  return {
    total: assigned.length,
    confirmed: confirmed.length,
    pending: pending.length,
    revenue,
    upcoming: upcoming.length,
  };
}
