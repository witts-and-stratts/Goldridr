"use client";

import { format, isSameDay } from "date-fns";
import { toast } from "sonner";

export interface AlternativeSlot {
  date: string;
  time: string;
}

interface BookingErrorPayload {
  error?: string;
  message?: string;
  alternativeSlots?: AlternativeSlot[];
}

function slotDate( slot: AlternativeSlot ): Date {
  return new Date( `${ slot.date }T00:00:00` );
}

export function formatSlotLabel( slot: AlternativeSlot ): string {
  const date = slotDate( slot );
  const day = isSameDay( date, new Date() ) ? "Today" : format( date, "EEE, MMM d" );
  return `${ day } · ${ slot.time }`;
}

/**
 * Shows a booking failure toast. For availability clashes the API's suggested
 * slots are rendered as buttons; picking one calls `onPickSlot` so the form
 * can move the pending booking to that slot.
 */
export function showBookingErrorToast(
  data: BookingErrorPayload,
  onPickSlot?: ( slot: AlternativeSlot ) => void,
) {
  if ( data.error !== "clash" ) {
    toast.error( "Booking failed", {
      description: data.message || data.error || "Please try again or contact us directly.",
    } );
    return;
  }

  const slots = data.alternativeSlots ?? [];
  const toastId = toast.error( "That time isn't available", {
    duration: 15000,
    description: (
      <div className="space-y-2">
        <p>{ data.message || "All of our chauffeurs are already reserved at that time." }</p>
        { slots.length > 0 && onPickSlot ? (
          <>
            <p className="font-medium">Closest available pickups — tap one to use it:</p>
            <div className="flex flex-wrap gap-1.5">
              { slots.map( ( slot ) => (
                <button
                  key={ `${ slot.date }-${ slot.time }` }
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                  onClick={ () => {
                    toast.dismiss( toastId );
                    onPickSlot( slot );
                    toast.success( "Pickup time updated", {
                      description: `Now set to ${ formatSlotLabel( slot ) }. Review your details and confirm again.`,
                    } );
                  } }
                >
                  { formatSlotLabel( slot ) }
                </button>
              ) ) }
            </div>
          </>
        ) : (
          <p>Please choose a different date or time and try again.</p>
        ) }
      </div>
    ),
  } );
}
