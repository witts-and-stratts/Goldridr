export type TemplateChannel = "email" | "sms" | "pdf";

export interface SmsContent {
  body: string;
}

export interface EmailEditableContent {
  subject?: string;
  preview?: string;
  heading?: string;
  message: string;
  ctaLabel?: string;
  footerNote?: string;
}

/** A complete, sanitized HTML document authored by an administrator. */

export interface PdfContent {
  title?: string;
  intro?: string;
  footer?: string;
}

export type TemplateContent = SmsContent | EmailEditableContent | PdfContent;

export type TemplateSource = "default" | "override";

export interface TemplateField {
  name: string;
  label: string;
  multiline?: boolean;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export interface TemplateAdminView {
  channel: TemplateChannel;
  templateId: string;
  key: string;
  variant: string;
  label: string;
  description: string;
  adminEditable: boolean;
  complianceManaged: boolean;
  fields: TemplateField[];
  allowedVariables: string[];
  samplePayload: Record<string, unknown>;
  defaultContent: TemplateContent;
  defaultEditorContent: TemplateContent;
  source: TemplateSource;
  enabled: boolean;
  revision: number;
  content: TemplateContent | null;
  updatedBy: string | null;
  updatedAt: string | null;
  sourceUpdatedAt: string | null;
}

export interface TemplateRevisionView {
  revision: number;
  action: string;
  previousContent: TemplateContent | null;
  content: TemplateContent | null;
  createdBy: string | null;
  note: string | null;
  createdAt: string | null;
}

export interface ResolvedTemplate {
  channel: TemplateChannel;
  templateId: string;
  variant: string;
  source: TemplateSource;
  revision: number;
  content: TemplateContent;
}
