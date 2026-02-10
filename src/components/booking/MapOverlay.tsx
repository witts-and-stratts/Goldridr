"use client";

import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface MapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  routeMapUrl?: { small: string; large: string; } | null;
  mapImageUrl?: string | null; // Direct image URL for simple maps
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
  routeMapUrl,
  mapImageUrl,
  title,
  pickupLocation,
  dropoffLocation,
  distanceData,
}: MapOverlayProps ) {
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
            className="relative w-full max-w-3xl bg-black rounded-xl border border-white/10 overflow-hidden"
            onClick={ ( e ) => e.stopPropagation() }
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-wide uppercase tracking-wider text-2xl font-serif">{ title || "Route Map" }</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={ onClose }
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="">
              { mapImageUrl ? (
                <img
                  src={ mapImageUrl }
                  alt="Map"
                  className="w-full rounded-lg"
                />
              ) : routeMapUrl ? (
                <img
                  src={ routeMapUrl.large }
                  alt="Route map"
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="w-full h-[400px] bg-black/40 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" />
                </div>
              ) }
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
