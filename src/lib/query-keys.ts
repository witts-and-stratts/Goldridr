export const qk = {
  bookings: () => [ "bookings" ] as const,
  blockedSlots: () => [ "blockedSlots" ] as const,
  chauffeurs: () => [ "chauffeurs" ] as const,
  payments: () => [ "payments" ] as const,
  discounts: () => [ "discounts" ] as const,
  settings: () => [ "settings" ] as const,
  notificationPreferences: () => [ "notificationPreferences" ] as const,
  notifications: ( opts?: object ) => [ "notifications", opts ] as const,
};
