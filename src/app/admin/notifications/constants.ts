import {
  AlertTriangle,
  BellRing,
  BookOpen,
  CircleAlert,
  Inbox,
  MailOpen,
  MessageSquareText,
} from "lucide-react";
import type { FolderConfig } from "./types";

export const folders: FolderConfig[] = [
  { value: "inbox", label: "All notifications", icon: Inbox },
  { value: "unread", label: "Unread", icon: MailOpen },
  { value: "bookings", label: "Bookings", icon: BookOpen },
  { value: "reminders", label: "Reminder activity", icon: BellRing },
  { value: "messages", label: "Messages", icon: MessageSquareText },
  { value: "system", label: "System", icon: CircleAlert },
  { value: "failures", label: "Delivery failures", icon: AlertTriangle },
];

export const activeReminderStatuses = new Set( [ "queued", "pending", "processing", "leased" ] );
