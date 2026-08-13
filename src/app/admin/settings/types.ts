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
  activeProcessor: "stripe" | "square";
  enabledProcessors: ProviderTab[];
  enabledMethods: string[];
  zelleRecipient: string;
  zelleInstructions: string;
  holdMinutes: string;
  zelleVerificationHours: string;
  hourlyRate: string;
  squareEnvironment: "sandbox" | "production";
  paypalEnvironment: "sandbox" | "production";
}

export type ProviderTab = "stripe" | "square" | "paypal" | "zelle";

export interface PaymentProviderConfiguration {
  environment: string;
  webhookPath: string;
  credentials: Record<string, boolean>;
}

export type PaymentProviderConfigurations = Record<"stripe" | "square" | "paypal", PaymentProviderConfiguration>;

export type PaymentCredentialKey =
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "SQUARE_ACCESS_TOKEN"
  | "SQUARE_APP_ID"
  | "SQUARE_LOCATION_ID"
  | "SQUARE_WEBHOOK_SIGNATURE_KEY"
  | "PAYPAL_CLIENT_ID"
  | "PAYPAL_CLIENT_SECRET"
  | "PAYPAL_WEBHOOK_ID";

export type PaymentCredentialDraft = Record<PaymentCredentialKey, string>;
