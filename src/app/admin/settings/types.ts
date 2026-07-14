export interface Preference {
  category: string;
  inApp: number;
  email: number;
  sms: number;
}

export interface AdminSettingsState {
  bookingBufferMinutes: string;
  notificationTimezone: string;
  appUrl: string;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
  priceByMileAirport: string;
  priceByMileCity: string;
  priceByMileHourly: string;
  twilioFromNumber: string;
}
