import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function DeliveryFailureEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function deliveryFailureContent( payload: Record<string, unknown> ): EmailEditableContent { return { subject: "Notification delivery failed", preview: "A notification needs administrator attention.", heading: "Delivery moved to dead letter", message: stringValue( payload.message ), ctaLabel: "Review notifications" }; }
