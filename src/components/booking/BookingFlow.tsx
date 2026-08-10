"use client";

import { UnifiedBookingForm } from "./forms/UnifiedBookingForm";
import type { BookingView } from "./booking-services";

interface BookingFlowProps {
  view: BookingView;
  onViewChange: ( view: BookingView ) => void;
  onSuccess: () => void;
}

// All three services share one form now; `view` only decides which service tab
// starts selected, so deep links like /book/hourly keep working.
export function BookingFlow( { view, onViewChange, onSuccess }: BookingFlowProps ) {
  return (
    <UnifiedBookingForm
      service={ view === "options" ? "airport" : view }
      onServiceChange={ onViewChange }
      onSuccess={ onSuccess }
    />
  );
}
