import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function ChauffeurAssignmentEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function chauffeurAssignmentContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const passenger = stringValue( payload.passengerName ) || "Passenger"; const dateTime = payload.date && payload.time ? `${ stringValue( payload.date ) } at ${ stringValue( payload.time ) }` : ""; return { subject: `You were assigned booking ${ reference }`, preview: "A booking was assigned to you.", heading: "New chauffeur assignment", message: `You are assigned to ${ passenger }'s ride on ${ dateTime }.`, ctaLabel: "Open dispatch" }; }
