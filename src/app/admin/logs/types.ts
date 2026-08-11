export type LogProvider = "twilio" | "resend" | "ses";
export type ValidationStatus = "valid" | "invalid" | "not_configured" | "not_applicable";
export type ProcessingStatus = "processed" | "ignored" | "rejected" | "failed";

export interface WebhookLogSummary {
  id: string;
  requestId: string;
  provider: LogProvider;
  endpoint: string;
  method: string;
  validationStatus: ValidationStatus;
  processingStatus: ProcessingStatus;
  eventType: string;
  providerEventId: string;
  providerMessageId: string;
  responseStatus: number;
  durationMs: number;
  preview: string;
  receivedAt: string;
}

export interface WebhookLogDetail extends WebhookLogSummary {
  contentType: string;
  sourceIp: string;
  requestHeaders: Record<string, unknown>;
  payload: unknown;
  rawBody: string;
  responseHeaders: Record<string, unknown>;
  responseBody: string;
  errorMessage: string;
  expiresAt: string;
}

export interface WebhookLogPage {
  items: WebhookLogSummary[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}
