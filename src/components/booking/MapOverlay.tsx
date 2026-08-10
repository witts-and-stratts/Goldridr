"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { InteractiveRouteMap } from "@/components/booking/InteractiveRouteMap";

interface MapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  pickupLocation: string;
  dropoffLocation?: string; // Optional for Hourly
  distanceData?: {
    total_miles: number;
    duration_text: string;
    total_price: number;
  } | null;
}

export function MapOverlay( {
  isOpen,
  onClose,
  title,
  pickupLocation,
  dropoffLocation,
  distanceData,
}: MapOverlayProps ) {
  useEffect( () => {
    if ( !isOpen ) return;

    const onKeyDown = ( event: KeyboardEvent ) => {
      if ( event.key === "Escape" ) onClose();
    };

    window.addEventListener( "keydown", onKeyDown );
    return () => window.removeEventListener( "keydown", onKeyDown );
  }, [ isOpen, onClose ] );

  return (
    <AnimatePresence>
      { isOpen && (
        <motion.div
          initial={ { opacity: 0 } }
          animate={ { opacity: 1 } }
          exit={ { opacity: 0 } }
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={ onClose }
        >
          <motion.div
            initial={ { scale: 0.9, opacity: 0 } }
            animate={ { scale: 1, opacity: 1 } }
            exit={ { scale: 0.9, opacity: 0 } }
            className="relative w-full max-w-4xl overflow-hidden border border-white/10 bg-black"
            onClick={ ( e ) => e.stopPropagation() }
            role="dialog"
            aria-modal="true"
            aria-label={ title || "Route map" }
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-wide uppercase tracking-wider text-2xl font-serif">{ title || "Route Map" }</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={ onClose }
                className="text-white/70 hover:text-white"
                aria-label="Close map"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div>
              <InteractiveRouteMap
                pickupLocation={ pickupLocation }
                dropoffLocation={ dropoffLocation }
                expanded
                className="h-[min(62vh,560px)] w-full"
              />
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm p-4 pt-0">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
                  <div>
                    <span className="text-gray-500 block text-xs">Pickup</span>
                    <span className="text-white">{ pickupLocation }</span>
                  </div>
                </div>
                { dropoffLocation && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">B</div>
                    <div>
                      <span className="text-gray-500 block text-xs">Dropoff</span>
                      <span className="text-white">{ dropoffLocation }</span>
                    </div>
                  </div>
                ) }
              </div>
              { distanceData && (
                <div className="mx-4 mb-4 pt-4 border-t border-white/10 flex justify-between text-white">
                  <span>{ distanceData.total_miles } miles • { distanceData.duration_text }</span>
                  <span className="font-bold text-gold">${ distanceData.total_price.toFixed( 2 ) }</span>
                </div>
              ) }
            </div>
          </motion.div>
        </motion.div>
      ) }
    </AnimatePresence>
  );
}
