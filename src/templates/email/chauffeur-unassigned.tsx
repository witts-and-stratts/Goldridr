import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function ChauffeurUnassignedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function chauffeurUnassignedContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); return { subject: `Assignment removed for ${ reference }`, preview: "A booking assignment changed.", heading: "Assignment removed", message: `You are no longer assigned to booking ${ reference }.` }; }
