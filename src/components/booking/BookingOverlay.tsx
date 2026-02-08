import { useState, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { BookingOptions } from "./BookingOptions";
import { AirportForm } from "./forms/AirportForm";
import { TownForm } from "./forms/TownForm";
import { HourlyForm } from "./forms/HourlyForm";

interface BookingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = "options" | "airport" | "town" | "hourly";

export function BookingOverlay( { isOpen, onClose }: BookingOverlayProps ) {
  const [ view, setView ] = useState<View>( "options" );

  const handleClose = ( open: boolean ) => {
    if ( !open ) {
      onClose();
      // Small delay to reset view after dialog closes
      setTimeout( () => setView( "options" ), 300 );
    }
  };

  return (
    <Dialog open={ isOpen } onOpenChange={ handleClose }>
      <DialogContent className="max-w-7xl bg-black/60 border-none shadow-none p-0 overflow-hidden text-white sm:max-w-7xl h-full">
        <div className="sr-only">
          <DialogTitle>Booking Overlay</DialogTitle>
          <DialogDescription>
            Select a service type and book your ride.
          </DialogDescription>
        </div>

        <div className="flex items-center justify-center w-full min-h-[60vh]">
          { view === "options" && (
            <BookingOptions onSelect={ ( option ) => setView( option ) } />
          ) }

          { view === "airport" && (
            <AirportForm onBack={ () => setView( "options" ) } />
          ) }

          { view === "town" && (
            <TownForm onBack={ () => setView( "options" ) } />
          ) }

          { view === "hourly" && (
            <HourlyForm onBack={ () => setView( "options" ) } />
          ) }
        </div>
      </DialogContent>
    </Dialog>
  );
}
