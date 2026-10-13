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
  activeProcessor: "stripe";
  enabledProcessors: ProviderTab[];
  enabledMethods: string[];
  zelleRecipient: string;
  zelleInstructions: string;
  holdMinutes: string;
  zelleVerificationHours: string;
  hourlyRate: string;
  roundTripDiscountPercent: string;
  paypalEnvironment: "sandbox" | "production";
}

export type ProviderTab = "stripe" | "paypal" | "zelle";

export interface PaymentProviderConfiguration {
  environment: string;
  webhookPath: string;
  credentials: Record<string, boolean>;
}

export type PaymentProviderConfigurations = Record<"stripe" | "paypal", PaymentProviderConfiguration>;

export type PaymentCredentialKey =
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "PAYPAL_CLIENT_ID"
  | "PAYPAL_CLIENT_SECRET"
  | "PAYPAL_WEBHOOK_ID";

export type PaymentCredentialDraft = Record<PaymentCredentialKey, string>;
