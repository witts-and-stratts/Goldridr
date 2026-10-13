import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { formatBookingStatus } from "@/lib/booking-status-label";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingStatusUpdatedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingStatusUpdatedContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const status = formatBookingStatus( stringValue( payload.status ) ) || "Updated"; return { subject: `Booking ${ reference } is ${ status }`, preview: `Your booking status changed to ${ status }.`, heading: `Booking ${ status }`, message: `Your booking ${ reference } is now ${ status }.` }; }
