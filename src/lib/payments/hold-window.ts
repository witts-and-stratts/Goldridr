export function extendedPaymentHoldExpiry( currentExpiry: string | null, extensionMinutes: number, now = new Date() ): string {
  const currentExpiryTime = currentExpiry ? new Date( currentExpiry ).getTime() : Number.NaN;
  const baseTime = Number.isFinite( currentExpiryTime ) && currentExpiryTime > now.getTime()
    ? currentExpiryTime
    : now.getTime();
  return new Date( baseTime + extensionMinutes * 60_000 ).toISOString();
}
