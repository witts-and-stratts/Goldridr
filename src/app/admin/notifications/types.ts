import type { LucideIcon } from "lucide-react";

export interface NotificationItem {
  recipientId: number;
  category: string;
  title: string;
  body: string;
  bookingReference?: string | null;
  metadata: string;
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

export interface MessageThread {
  key: string;
  riderName: string;
  riderEmail: string | null;
  bookingReference: string | null;
  messages: NotificationItem[];
  unreadCount: number;
  lastActivity: string;
}

export type Folder = "inbox" | "unread" | "bookings" | "reminders" | "messages" | "system" | "failures";

export interface FolderConfig {
  value: Folder;
  label: string;
  icon: LucideIcon;
}

export type StatusVariant = "default" | "destructive" | "outline";
