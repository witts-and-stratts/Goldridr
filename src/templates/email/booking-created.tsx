import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingCreatedEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingCreatedContent( payload: Record<string, unknown> ): EmailEditableContent {
  const reference = stringValue( payload.bookingReference ); const passenger = stringValue( payload.passengerName ) || "Passenger"; const pin = stringValue( payload.pin );
  return { subject: `We received booking ${ reference }`, preview: "Your GoldRidrbooking request was received.", heading: "Booking request received", message: `Hi ${ passenger }, your chauffeur is held for two hours. Pay the quoted fare to confirm your ride.${ pin ? " Keep your 4-digit pickup PIN private until you meet your driver." : "" }`, footerNote: "Your hold expires if payment is not completed by the time shown on the payment page.", ctaLabel: "Pay to confirm" };
}
