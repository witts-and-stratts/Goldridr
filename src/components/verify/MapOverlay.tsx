"use client";

import { Button } from "@/components/ui/button";
import { InteractiveRouteMap } from "@/components/booking/InteractiveRouteMap";
import { MapPin, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";

interface MapOverlayProps {
  pickupLocation?: string;
  destinationLocation?: string;
  onClose: () => void;
}

export function MapOverlay( {
  pickupLocation,
  destinationLocation,
  onClose,
}: MapOverlayProps ) {
  useEffect( () => {
    const onKeyDown = ( event: KeyboardEvent ) => {
      if ( event.key === "Escape" ) onClose();
    };

    window.addEventListener( "keydown", onKeyDown );
    return () => window.removeEventListener( "keydown", onKeyDown );
  }, [ onClose ] );

  return (
    <motion.div
      initial={ { opacity: 0 } }
      animate={ { opacity: 1 } }
      exit={ { opacity: 0 } }
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={ onClose }
    >
      <motion.div
        initial={ { scale: 0.9, opacity: 0 } }
        animate={ { scale: 1, opacity: 1 } }
        exit={ { scale: 0.9, opacity: 0 } }
        className="relative max-w-4xl w-full bg-[#0a0a0a] overflow-hidden border border-white/10"
        onClick={ ( e ) => e.stopPropagation() }
        role="dialog"
        aria-modal="true"
        aria-label="Route map"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-wide uppercase tracking-wider text-xl">Route Map</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={ onClose }
            className="text-gray-400 hover:text-white"
            aria-label="Close map"
          >
            <X className="size-5" />
          </Button>
        </div>
        <InteractiveRouteMap
          pickupLocation={ pickupLocation || "" }
          dropoffLocation={ destinationLocation }
          expanded
          className="h-[min(62vh,560px)] w-full"
        />
        { ( pickupLocation || destinationLocation ) && (
          <div className="p-4 space-y-2 text-sm">
            { pickupLocation && (
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">{ pickupLocation }</span>
              </div>
            ) }
            { destinationLocation && (
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">{ destinationLocation }</span>
              </div>
            ) }
          </div>
        ) }
      </motion.div>
    </motion.div>
  );
}
