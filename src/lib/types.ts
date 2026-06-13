export interface Chauffeur {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface BlockedSlot {
  id: number;
  title: string;
  date: string;
  endDate?: string | null;
  isFullDay: number;
  time: string;
  duration: number;
  recurring: "none" | "daily" | "weekly" | "weekends" | string;
  chauffeurId?: number | null;
}

export type Role = "admin" | "chauffeur";

export interface SessionUser {
  name: string;
  email: string;
}

export interface DriverRide {
  reference: string;
  status: string;
  chauffeurId?: number | null;
  tripType: string;
  date: string;
  time: string;
  duration: number;
  customerName: string;
  customerPhone: string | null;
  pickup: string | null;
  destination: string | null;
  passengers: string | null;
  flightNumber: string | null;
  estimatedPrice: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Admin types — mirror the shapes returned by the /api/admin/* routes.
// ---------------------------------------------------------------------------

export interface AdminBookingTripDetails {
  pickupAddress?: string;
  destinationAddress?: string;
  passengers?: string;
  flightNumber?: string;
  estimatedPrice?: string;
  [key: string]: unknown;
}

export interface AdminBooking {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  duration: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: string;
  tripDetails: AdminBookingTripDetails;
  chauffeurId?: number | null;
  createdAt: string;
}

export interface AdminChauffeur {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
}

export type DiscountKind = "percent" | "fixed";

export interface DiscountUsage {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  tripType: string;
  tripDate: string;
  tripTime: string;
  bookingStatus: string;
  originalAmountCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
  createdAt: string;
}

export interface DiscountCode {
  id: number;
  code: string;
  label: string;
  kind: DiscountKind;
  value: number;
  active: number;
  maxRedemptions: number | null;
  redemptions: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  usages: DiscountUsage[];
  trackedRedemptions: number;
  totalDiscountCents: number;
  totalRevenueCents: number;
}

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "card" | "cash" | "bank_transfer" | "other";

export interface Payment {
  id: number;
  bookingReference: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  transactionReference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerEmail?: string;
  tripType?: string;
  tripDate?: string;
  tripTime?: string;
  bookingStatus?: string;
}

export interface AppNotification {
  recipientId: number;
  type: string;
  category: "bookings" | "reminders" | "messages" | "system" | string;
  title: string;
  body: string;
  bookingReference: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface FailedDelivery {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  title: string;
  bookingReference?: string | null;
  lastError: string | null;
}

export interface ReminderDelivery {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  title: string;
  bookingReference: string | null;
  passengerName: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  scheduledAt: string;
  updatedAt: string;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
}

export interface MessageRecipient {
  reference: string;
  name: string;
  email: string;
  phone?: string | null;
  smsConsented: boolean;
  date: string;
  time: string;
}

export interface ReminderBooking extends MessageRecipient {
  status: string;
}

export type NotificationCategory = "bookings" | "reminders" | "messages" | "system";

export interface NotificationPreference {
  category: NotificationCategory;
  inApp: number | boolean;
  email: number | boolean;
  sms: number | boolean;
}

export interface MockSmsMessage {
  sid: string;
  accountSid: string | null;
  from: string;
  to: string;
  body: string;
  status: string;
  errorMessage: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface AdminSettings {
  bookingBufferMinutes: number;
  notificationTimezone: string;
  appUrl: string;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
  priceByMileAirport: number;
  priceByMileCity: number;
  priceByMileHourly: number;
  twilioFromNumber: string;
}
