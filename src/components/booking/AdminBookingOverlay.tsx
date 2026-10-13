"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingServiceType } from "@/lib/form-schemas";
import { UnifiedBookingForm } from "./forms/UnifiedBookingForm";
import "./BookingOverlay.css";

interface AdminBookingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminBookingOverlay( { isOpen, onClose, onSuccess }: AdminBookingOverlayProps ) {
  const [ service, setService ] = useState<BookingServiceType>( "airport" );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={( open ) => {
        if ( !open ) {
          onClose();
          setTimeout( () => setService( "airport" ), 300 );
        }
      }}
    >
      <DialogContent className="booking-overlay">
        <div className="sr-only">
          <DialogTitle>Create booking</DialogTitle>
          <DialogDescription>
            Create a booking on behalf of a passenger.
          </DialogDescription>
        </div>

        <div className="booking-overlay__frame">
          <UnifiedBookingForm
            service={service}
            onServiceChange={setService}
            onClose={onClose}
            onSuccess={onSuccess}
            endpoint="/api/admin/bookings"
            showPricingOverrides
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
