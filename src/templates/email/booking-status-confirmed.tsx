import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingStatusConfirmedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingStatusConfirmedContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const passenger = stringValue( payload.passengerName ) || "Passenger"; return { subject: `Booking ${ reference } confirmed`, preview: "Your GoldRidrbooking is confirmed.", heading: "Booking confirmed", message: `Hi ${ passenger }, your chauffeur service is confirmed. Your booking details are below.`, footerNote: "Your booking is confirmed. Keep this email handy for your booking reference and ride details." }; }
