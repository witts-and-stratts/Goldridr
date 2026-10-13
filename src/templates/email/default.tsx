import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function DefaultEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function defaultContent( payload: Record<string, unknown> ): EmailEditableContent { const subject = stringValue( payload.subject ); const message = stringValue( payload.message ); return { subject: subject || "GoldRidrnotification", preview: message.slice( 0, 120 ), heading: subject || "Goldridr", message }; }
