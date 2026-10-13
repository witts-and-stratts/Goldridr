import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingAssignmentUnassignedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingAssignmentUnassignedContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const passenger = stringValue( payload.passengerName ) || "Passenger"; return { subject: `Chauffeur assignment removed for ${ reference }`, preview: "Your booking is awaiting a new chauffeur.", heading: "Chauffeur update", message: `Hi ${ passenger }, your previous chauffeur assignment changed. Our team is arranging the next assignment.` }; }
