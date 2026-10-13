import { GoldridrEmail, type EmailContent } from "./goldridr-email";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
export function BookingReminderEmail( { content }: { content: EmailContent } ) { return <GoldridrEmail content={ content } />; }
export function bookingReminderContent( payload: Record<string, unknown> ): EmailEditableContent { const reference = stringValue( payload.bookingReference ); const dateTime = payload.date && payload.time ? `${ stringValue( payload.date ) } at ${ stringValue( payload.time ) }` : ""; const reminder = stringValue( payload.reminderHours ); return { subject: reminder === "Manual" ? `Pickup reminder for ${ reference }` : `${ reminder }-hour reminder for ${ reference }`, preview: "Your GoldRidrpickup is approaching.", heading: "Your ride is coming up", message: `This is a reminder that your GoldRidrpickup is scheduled for ${ dateTime }.` }; }
