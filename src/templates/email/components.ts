import type { ComponentType } from "react";
import type { EmailContent } from "./goldridr-email";
import { BookingAssignmentAssignedEmail } from "./booking-assignment-assigned";
import { BookingAssignmentUnassignedEmail } from "./booking-assignment-unassigned";
import { BookingCreatedEmail } from "./booking-created";
import { BookingDeletedEmail } from "./booking-deleted";
import { BookingReminderEmail } from "./booking-reminder";
import { BookingStatusConfirmedEmail } from "./booking-status-confirmed";
import { BookingStatusUpdatedEmail } from "./booking-status-updated";
import { ChauffeurAssignmentEmail } from "./chauffeur-assignment";
import { ChauffeurReminderEmail } from "./chauffeur-reminder";
import { ChauffeurUnassignedEmail } from "./chauffeur-unassigned";
import { DefaultEmail } from "./default";
import { DeliveryFailureEmail } from "./delivery-failure";

export type EmailTemplateComponent = ComponentType<{ content: EmailContent }>;

const components: Record<string, EmailTemplateComponent> = {
  "booking_created": BookingCreatedEmail,
  "booking_status:confirmed": BookingStatusConfirmedEmail,
  "booking_status:updated": BookingStatusUpdatedEmail,
  "booking_assignment:assigned": BookingAssignmentAssignedEmail,
  "booking_assignment:unassigned": BookingAssignmentUnassignedEmail,
  "booking_deleted": BookingDeletedEmail,
  "booking_reminder": BookingReminderEmail,
  "chauffeur_assignment": ChauffeurAssignmentEmail,
  "chauffeur_unassigned": ChauffeurUnassignedEmail,
  "chauffeur_reminder": ChauffeurReminderEmail,
  "delivery_failure": DeliveryFailureEmail,
  "default": DefaultEmail,
};

export function emailComponentFor( templateId: string ): EmailTemplateComponent {
  return components[ templateId ] || components[ templateId.split( ":" )[ 0 ] ] || DefaultEmail;
}
