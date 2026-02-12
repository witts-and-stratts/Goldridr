"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import { useBookingOverlay } from "@/components/booking/BookingContext";

interface AirportsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOUSTON_AIRPORTS = [
  {
    name: "George Bush Intercontinental Airport (IAH)",
    description: "The primary international airport serving the Greater Houston area.",
    type: "International Hub"
  },
  {
    name: "William P. Hobby Airport (HOU)",
    description: "Houston's oldest commercial airport, a key hub for domestic flights.",
    type: "Domestic Hub"
  },
  {
    name: "Ellington Airport (EFD)",
    description: "Serving the US military, NASA, and general aviation.",
    type: "Military / Space"
  },
  {
    name: "David Wayne Hooks Memorial Airport (DWH)",
    description: "One of the largest private airports in the US, specializing in charter flights.",
    type: "Private / Charter"
  },
  {
    name: "Sugar Land Regional Airport (SGR)",
    description: "A popular choice for corporate aviation in the southwest Houston area.",
    type: "Corporate / Executive"
  }
];

export function AirportsOverlay( { isOpen, onClose }: AirportsOverlayProps ) {
  const { setIsOpen: setBookingOpen } = useBookingOverlay();

  const handleBookTransfer = () => {
    onClose();
    // Small delay to allow potential exit animations or state updates to settle
    setTimeout( () => setBookingOpen( true ), 100 );
  };

  return (
    <Dialog open={ isOpen } onOpenChange={ onClose }>
      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="font-serif text-3xl text-center uppercase tracking-wide">
            Premium Airport Coverage
          </DialogTitle>
          <p className="text-gray-400 text-center font-light uppercase tracking-widest text-xs mt-2">
            Servicing all major Houston Locations
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          { HOUSTON_AIRPORTS.map( ( airport ) => (
            <div
              key={ airport.name }
              className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-gold/30 transition-colors"
            >
              <div className="mt-1 p-2 bg-black rounded-full border border-white/10 text-gold">
                <Plane className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-white">{ airport.name }</h3>
                  <span className="text-[10px] uppercase tracking-wider text-gold bg-gold/10 px-2 py-1 rounded">
                    { airport.type }
                  </span>
                </div>
                <p className="text-sm text-gray-400 font-light leading-relaxed">
                  { airport.description }
                </p>
              </div>
            </div>
          ) ) }
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex justify-center">
          <Button
            onClick={ handleBookTransfer }
            className="bg-gold hover:bg-gold/90 text-black font-bold w-full sm:w-auto min-w-[200px]"
          >
            BOOK A TRANSFER
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
