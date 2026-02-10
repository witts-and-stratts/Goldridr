"use client";

import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import { motion } from "motion/react";

interface MapOverlayProps {
  mapUrl: string;
  pickupLocation?: string;
  destinationLocation?: string;
  onClose: () => void;
}

export function MapOverlay( {
  mapUrl,
  pickupLocation,
  destinationLocation,
  onClose,
}: MapOverlayProps ) {
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
        className="relative max-w-4xl w-full bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/10"
        onClick={ ( e ) => e.stopPropagation() }
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-wide uppercase tracking-wider text-xl">Route Map</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={ onClose }
            className="text-gray-400 hover:text-white"
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="aspect-video relative">
          <img
            src={ mapUrl }
            alt="Route map"
            className="w-full h-full object-cover"
          />
        </div>
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
