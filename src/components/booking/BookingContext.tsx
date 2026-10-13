'use client';

import { useState, useCallback, createContext, useContext, Dispatch, SetStateAction } from "react";
import { BookingOverlay } from "./BookingOverlay";
import { AvailabilityOverlay } from "./AvailabilityOverlay";
interface BookingOverlayContextType {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  isAvailabilityOpen: boolean;
  setAvailabilityOpen: Dispatch<SetStateAction<boolean>>;
}

const BookingOverlayContext = createContext<BookingOverlayContextType>( {
  isOpen: false,
  setIsOpen: () => { },
  isAvailabilityOpen: false,
  setAvailabilityOpen: () => { },
} );

export const useBookingOverlay = () => {
  return useContext( BookingOverlayContext );
};

export function BookingOverlayWrapper( { children }: { children: React.ReactNode; } ) {
  const [ isOpen, setIsOpen ] = useState( false );
  const [ isAvailabilityOpen, setAvailabilityOpen ] = useState( false );
  const open = useCallback( () => setIsOpen( true ), [] );
  const close = useCallback( () => setIsOpen( false ), [] );

  return (
    <BookingOverlayContext.Provider value={ { isOpen, setIsOpen, isAvailabilityOpen, setAvailabilityOpen } }>
      { children }
      <BookingOverlay isOpen={ isOpen } onClose={ close } onOpen={ open } />
      <AvailabilityOverlay isOpen={ isAvailabilityOpen } onClose={ () => setAvailabilityOpen( false ) } onBook={ () => { setAvailabilityOpen( false ); setIsOpen( true ); } } />
    </BookingOverlayContext.Provider>
  );
}
