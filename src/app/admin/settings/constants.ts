import type { AdminSettingsState } from "./types";
import { Bell, Mail, MessageSquareText } from "lucide-react";

export const EMPTY_SETTINGS: AdminSettingsState = {
  bookingBufferMinutes: "30",
  notificationTimezone: "America/Chicago",
  appUrl: "http://localhost:3000",
  emailFromName: "Goldridr",
  emailFromAddress: "notifications@example.com",
  emailReplyTo: "",
  priceByMileAirport: "5",
  priceByMileCity: "3",
  priceByMileHourly: "4",
  twilioFromNumber: "+10000000000",
  activeProcessor: "stripe",
  enabledProcessors: [ "stripe", "square", "paypal", "zelle" ],
  enabledMethods: [ "card", "apple_pay", "cash_app", "venmo", "zelle" ],
  zelleRecipient: "",
  zelleInstructions: "Send the exact fare and include your booking reference in the memo.",
  holdMinutes: "120",
  zelleVerificationHours: "24",
  hourlyRate: "75",
  squareEnvironment: "sandbox",
  paypalEnvironment: "sandbox",
};

export const EMPTY_PAYMENT_CREDENTIALS = {
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  SQUARE_ACCESS_TOKEN: "",
  SQUARE_APP_ID: "",
  SQUARE_LOCATION_ID: "",
  SQUARE_WEBHOOK_SIGNATURE_KEY: "",
  PAYPAL_CLIENT_ID: "",
  PAYPAL_CLIENT_SECRET: "",
  PAYPAL_WEBHOOK_ID: "",
} as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "card", label: "Credit or debit card" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "cash_app", label: "Cash App Pay" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
] as const;

export const NOTIFICATION_CATEGORIES = [
  { value: "bookings", label: "Booking activity", description: "New bookings, status changes, assignments, and schedule changes." },
  { value: "reminders", label: "Pickup reminders", description: "Upcoming ride reminders before the scheduled pickup." },
  { value: "messages", label: "Messages", description: "Direct messages and operational broadcasts." },
  { value: "system", label: "System alerts", description: "Conflicts, delivery failures, and service-level warnings." },
];

export const NOTIFICATION_CHANNELS = [
  { value: "inApp" as const, label: "In-app", icon: Bell },
  { value: "email" as const, label: "Email", icon: Mail },
  { value: "sms" as const, label: "SMS", icon: MessageSquareText },
];
