import { formatBookingStatus } from "@/lib/booking-status-label";
import {
  formatBookingDate,
  formatBookingTime,
  formatCurrency,
  stringValue,
  tripDurationLabel,
  tripTypeLabel,
} from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
import { bookingAssignmentAssignedContent } from "./booking-assignment-assigned";
import { bookingAssignmentUnassignedContent } from "./booking-assignment-unassigned";
import { bookingCreatedContent } from "./booking-created";
import { bookingDeletedContent } from "./booking-deleted";
import { bookingReminderContent } from "./booking-reminder";
import { bookingStatusConfirmedContent } from "./booking-status-confirmed";
import { bookingStatusUpdatedContent } from "./booking-status-updated";
import { chauffeurAssignmentContent } from "./chauffeur-assignment";
import { chauffeurReminderContent } from "./chauffeur-reminder";
import { chauffeurUnassignedContent } from "./chauffeur-unassigned";
import { defaultContent } from "./default";
import { deliveryFailureContent } from "./delivery-failure";

export interface BookingSummary {
  reference: string;
  statusLabel: string;
  service: string;
  date: string;
  time: string;
  pickup: string;
  dropoff?: string;
  passengers?: string;
  flightNumber?: string;
  terminal?: string;
  duration?: string;
  estimate?: string;
  notes?: string;
}

export interface EmailLayout {
  appUrl: string;
  ctaUrl?: string;
  details?: Array<[ string, string ]>;
  booking?: BookingSummary;
}

export const RIDER_TRIP_EMAIL_TEMPLATES = new Set( [
  "booking_created",
  "booking_status",
  "booking_reminder",
  "booking_assignment",
  "booking_deleted",
  "manual_message",
] );

export function emailKey( templateId: string ): string {
  return templateId.split( ":" )[ 0 ];
}

export function emailVariant( templateId: string ): string {
  const parts = templateId.split( ":" );
  return parts.length > 1 ? parts.slice( 1 ).join( ":" ) : "";
}

function tripDetailsOf( payload: Record<string, unknown> ): Record<string, unknown> {
  return payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
}

export function bookingContent(
  payload: Record<string, unknown>,
  reference: string,
  statusLabel: string
): BookingSummary {
  const tripDetails = tripDetailsOf( payload );
  return {
    reference,
    statusLabel,
    service: tripTypeLabel( payload.tripType ),
    date: formatBookingDate( payload.date ),
    time: formatBookingTime( payload.time ),
    pickup: stringValue( tripDetails.pickupLocation || tripDetails.pickup ) || "To be confirmed",
    dropoff: stringValue( tripDetails.dropoffLocation || tripDetails.destination ),
    passengers: stringValue( tripDetails.passengers ),
    flightNumber: stringValue( tripDetails.flightNumber ),
    terminal: stringValue( tripDetails.terminal ),
    duration: tripDurationLabel( payload ),
    estimate: formatCurrency( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice ),
    notes: stringValue( payload.notes ),
  };
}

export function isConfirmedStatus( status: string ): boolean {
  const normalized = status.toLowerCase();
  return normalized === "confirmed" || normalized === "accepted";
}

export function emailLayout(
  templateId: string,
  payload: Record<string, unknown>,
  appUrl: string
): EmailLayout {
  const key = emailKey( templateId );
  const variant = emailVariant( templateId );
  const reference = stringValue( payload.bookingReference );
  const status = stringValue( payload.status ) ? formatBookingStatus( stringValue( payload.status ) ) : "";
  const dateTime = payload.date && payload.time ? `${ stringValue( payload.date ) } at ${ stringValue( payload.time ) }` : "";
  const layout: EmailLayout = { appUrl };

  switch ( key ) {
    case "booking_created": {
      layout.ctaUrl = stringValue( payload.paymentUrl );
      layout.booking = bookingContent( payload, reference, "Awaiting payment" );
      const pin = stringValue( payload.pin );
      if ( pin ) layout.details = [ [ "Your pickup PIN", pin ] ];
      return layout;
    }
    case "booking_status":
      if ( variant === "confirmed" || ( !variant && isConfirmedStatus( stringValue( payload.status ) ) ) ) {
        layout.booking = bookingContent( payload, reference, "Confirmed" );
        return layout;
      }
      layout.details = [ [ "Pickup", dateTime ] ];
      layout.booking = bookingContent( payload, reference, status || "Updated" );
      return layout;
    case "booking_assignment": {
      const assigned = variant === "assigned" || ( !variant && [ "assigned", "reassigned" ].includes( stringValue( payload.action ) ) );
      layout.booking = bookingContent( payload, reference, assigned ? "Chauffeur assigned" : "Awaiting chauffeur" );
      return layout;
    }
    case "booking_deleted":
      layout.details = [ [ "Scheduled pickup", dateTime ] ];
      layout.booking = bookingContent( payload, reference, "Deleted" );
      return layout;
    case "booking_reminder":
      layout.details = [ [ "Reference", reference ] ];
      layout.booking = bookingContent( payload, reference, "Pickup reminder" );
      return layout;
    case "chauffeur_assignment":
      layout.ctaUrl = `${ appUrl }/admin/bookings`;
      layout.booking = bookingContent( payload, reference, "Assigned" );
      return layout;
    case "chauffeur_reminder":
      layout.ctaUrl = `${ appUrl }/admin/bookings`;
      layout.booking = bookingContent( payload, reference, "Pickup reminder" );
      return layout;
    case "delivery_failure":
      layout.ctaUrl = `${ appUrl }/admin/notifications`;
      return layout;
    default:
      return layout;
  }
}

export function emailDefaultContent(
  templateId: string,
  payload: Record<string, unknown>
): EmailEditableContent {
  const key = emailKey( templateId );
  const variant = emailVariant( templateId );
  if ( key === "booking_created" ) return bookingCreatedContent( payload );
  if ( key === "booking_status" ) return variant === "confirmed" || ( !variant && isConfirmedStatus( stringValue( payload.status ) ) ) ? bookingStatusConfirmedContent( payload ) : bookingStatusUpdatedContent( payload );
  if ( key === "booking_assignment" ) return variant === "assigned" || ( !variant && [ "assigned", "reassigned" ].includes( stringValue( payload.action ) ) ) ? bookingAssignmentAssignedContent( payload ) : bookingAssignmentUnassignedContent( payload );
  if ( key === "booking_deleted" ) return bookingDeletedContent( payload );
  if ( key === "booking_reminder" ) return bookingReminderContent( payload );
  if ( key === "chauffeur_assignment" ) return chauffeurAssignmentContent( payload );
  if ( key === "chauffeur_unassigned" ) return chauffeurUnassignedContent( payload );
  if ( key === "chauffeur_reminder" ) return chauffeurReminderContent( payload );
  if ( key === "delivery_failure" ) return deliveryFailureContent( payload );
  return defaultContent( payload );
}
