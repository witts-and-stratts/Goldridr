import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingDeletedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingDeletedContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const passenger = stringValue( payload.passengerName ) || "Passenger"; return { subject: `Booking ${ reference } was deleted`, preview: "Your GoldRidrbooking record was removed.", heading: "Booking deleted", message: `Hi ${ passenger }, booking ${ reference } has been removed from our system. Contact GoldRidr if you believe this was unexpected.` }; }
