'use client';

import { useState, createContext, useContext, Dispatch, SetStateAction } from "react";
import { BookingOverlay } from "./BookingOverlay";
interface BookingOverlayContextType {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const BookingOverlayContext = createContext<BookingOverlayContextType>( {
  isOpen: false,
  setIsOpen: () => { },
} );

export const useBookingOverlay = () => {
  return useContext( BookingOverlayContext );
};

export function BookingOverlayWrapper( { children }: { children: React.ReactNode; } ) {
  const [ isOpen, setIsOpen ] = useState( false );

  return (
    <BookingOverlayContext.Provider value={ { isOpen, setIsOpen } }>
      { children }
      <BookingOverlay isOpen={ isOpen } onClose={ () => setIsOpen( false ) } />
    </BookingOverlayContext.Provider>
  );
}