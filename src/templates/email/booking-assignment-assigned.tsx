import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingAssignmentAssignedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingAssignmentAssignedContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const passenger = stringValue( payload.passengerName ) || "Passenger"; const chauffeur = stringValue( payload.chauffeurName ); return { subject: `Chauffeur update for booking ${ reference }`, preview: "Your chauffeur assignment has been updated.", heading: "Your chauffeur is assigned", message: `Hi ${ passenger }, ${ chauffeur } is assigned to your GoldRidrbooking.` }; }
