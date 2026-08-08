"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { BookingFlow } from "./BookingFlow";
import { isBookingServiceSlug, type BookingView } from "./booking-services";

interface BookingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

// The overlay mirrors the standalone /book route in the URL so a popup session can be
// shared, bookmarked and reopened with the browser back button.
export function viewToHash( view: BookingView ): string {
  return view === "options" ? "#book" : `#book-${ view }`;
}

export function hashToView( hash: string ): BookingView | null {
  const value = hash.replace( /^#/, "" );
  if ( value === "book" ) return "options";
  const slug = value.startsWith( "book-" ) ? value.slice( "book-".length ) : "";
  return isBookingServiceSlug( slug ) ? slug : null;
}

export function BookingOverlay( { isOpen, onClose, onOpen }: BookingOverlayProps ) {
  const [ view, setView ] = useState<BookingView>( "options" );

  const syncHash = useCallback( ( next: BookingView | null ) => {
    const url = new URL( window.location.href );
    url.hash = next ? viewToHash( next ) : "";
    window.history.replaceState( null, "", url.toString() );
  }, [] );

  // Deep links land on the page with the hash already set, and back/forward moves
  // between overlay views without a reload.
  useEffect( () => {
    const apply = () => {
      const next = hashToView( window.location.hash );
      if ( next ) {
        setView( next );
        onOpen();
      } else {
        onClose();
      }
    };
    apply();
    window.addEventListener( "hashchange", apply );
    return () => window.removeEventListener( "hashchange", apply );
  }, [ onOpen, onClose ] );

  useEffect( () => {
    if ( isOpen ) syncHash( view );
  }, [ isOpen, view, syncHash ] );

  const handleClose = ( open: boolean ) => {
    if ( open ) return;
    onClose();
    syncHash( null );
    // Small delay to reset view after dialog closes
    setTimeout( () => setView( "options" ), 300 );
  };

  return (
    <Dialog open={ isOpen } onOpenChange={ handleClose }>
      <DialogContent className="inset-0 left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-none bg-black/60 p-0 text-white shadow-none sm:max-w-none">
        <div className="sr-only">
          <DialogTitle>Booking Overlay</DialogTitle>
          <DialogDescription>
            Select a service type and book your ride.
          </DialogDescription>
        </div>

        <div className="flex min-h-full w-full items-center justify-center p-4 lg:p-0 lg:[&_.vega-form]:h-full lg:[&_.vega-form]:max-w-none lg:[&_.vega-form]:rounded-none lg:[&_.vega-form]:border-0 lg:[&_.vega-form>div]:max-h-none">
          <BookingFlow
            view={ view }
            onViewChange={ setView }
            onSuccess={ () => handleClose( false ) }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
