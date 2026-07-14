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
};

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
