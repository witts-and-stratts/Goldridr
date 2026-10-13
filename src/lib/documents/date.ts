export function formatInvoiceDate(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return "—";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T12:00:00` : normalized);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}
