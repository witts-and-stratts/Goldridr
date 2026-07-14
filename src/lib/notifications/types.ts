export type NotificationChannel = "in_app" | "email" | "sms";
export type NotificationCategory = "bookings" | "reminders" | "messages" | "system";
export type DeliveryStatus = "pending" | "processing" | "delivered" | "failed" | "dead_letter" | "cancelled";

export interface NotificationRecord {
  id: number;
  eventKey: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  bookingReference: string | null;
  metadata: string;
  createdAt: string;
}

export interface NotificationDeliveryRecord {
  id: number;
  backendId?: string;
  notificationId: number;
  channel: NotificationChannel;
  recipient: string;
  template: string | null;
  payload: string;
  idempotencyKey: string;
  status: DeliveryStatus;
  scheduledAt: string;
  nextAttemptAt: string;
  attempts: number;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
}

export interface RenderedEmail {
  from: string;
  replyTo?: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  tags?: Record<string, string>;
  idempotencyKey: string;
}

export interface EmailSendResult {
  provider: "smtp" | "ses_smtp" | "ses_api" | "resend" | "mailpit";
  messageId: string;
  accepted: string[];
  rejected: string[];
  response?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailTransport {
  verify(): Promise<void>;
  send(message: RenderedEmail): Promise<EmailSendResult>;
  close(): Promise<void>;
}
