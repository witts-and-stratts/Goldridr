"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookingOverlay } from "@/components/booking/BookingOverlay";
import { XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Extracted components
import { VerifyForm } from "@/components/verify/VerifyForm";
import { BookingCard } from "@/components/verify/BookingCard";
import { MapOverlay } from "@/components/verify/MapOverlay";

// Types
import { BookingData } from "@/types/booking";

// API helpers
async function fetchBooking( reference: string, email: string ): Promise<{ success: boolean; booking?: BookingData; error?: string; }> {
  const response = await fetch(
    `/api/booking/verify?reference=${ encodeURIComponent( reference.trim() ) }&email=${ encodeURIComponent( email.trim() ) }`
  );
  return response.json();
}

async function fetchRouteMapUrl( origin: string, destination: string ): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/route-map?origin=${ encodeURIComponent( origin ) }&destination=${ encodeURIComponent( destination ) }&size=600x400`
    );
    const data = await response.json();
    return data.staticMapUrl || null;
  } catch {
    console.log( "Failed to fetch route map" );
    return null;
  }
}

export default function VerifyBookingPage() {
  return (
    <Suspense fallback={ <div className="min-h-screen bg-black" /> }>
      <VerifyBookingContent />
    </Suspense>
  );
}

function VerifyBookingContent() {
  const searchParams = useSearchParams();

  // Form state
  const [ bookingReference, setBookingReference ] = useState( "" );
  const [ email, setEmail ] = useState( "" );

  // Loading and error state
  const [ isLoading, setIsLoading ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );

  // Booking data state
  const [ bookingData, setBookingData ] = useState<BookingData | null>( null );
  const [ routeMapUrl, setRouteMapUrl ] = useState<string | null>( null );

  // UI state
  const [ showMapOverlay, setShowMapOverlay ] = useState( false );
  const [ isBookingOpen, setIsBookingOpen ] = useState( false );
  const [ hasAutoVerified, setHasAutoVerified ] = useState( false );

  // Verify booking with given credentials
  const verifyBooking = async ( ref: string, emailAddress: string ) => {
    setIsLoading( true );
    setError( null );
    setBookingData( null );
    setRouteMapUrl( null );

    try {
      const result = await fetchBooking( ref, emailAddress );

      if ( result.success && result.booking ) {
        setBookingData( result.booking );

        // Fetch route map if we have pickup and destination
        const { pickup, destination } = result.booking.responses || {};
        if ( pickup && destination ) {
          const mapUrl = await fetchRouteMapUrl( pickup, destination );
          setRouteMapUrl( mapUrl );
        }
      } else {
        setError( result.error || "Booking not found" );
      }
    } catch {
      setError( "Failed to verify booking. Please try again." );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle form submission
  const handleVerify = async () => {
    if ( !bookingReference.trim() ) {
      setError( "Please enter your booking reference" );
      return;
    }
    if ( !email.trim() ) {
      setError( "Please enter your email address" );
      return;
    }
    await verifyBooking( bookingReference, email );
  };

  // Reset and search again
  const handleSearchAnother = () => {
    setBookingData( null );
    setRouteMapUrl( null );
    setBookingReference( "" );
    setEmail( "" );
  };

  // Read URL params on mount
  useEffect( () => {
    const refParam = searchParams.get( "reference" ) || searchParams.get( "booking_reference" ) || searchParams.get( "ref" );
    const emailParam = searchParams.get( "email" );

    if ( refParam ) setBookingReference( refParam.toUpperCase() );
    if ( emailParam ) setEmail( emailParam );

    // Auto-verify if both params present
    if ( refParam && emailParam && !hasAutoVerified ) {
      setHasAutoVerified( true );
      setTimeout( () => verifyBooking( refParam.toUpperCase(), emailParam ), 100 );
    }
  }, [ searchParams, hasAutoVerified ] );

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <section className="flex-1 pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-xl mx-auto">
          {/* Header */ }
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl mb-4">
              Verify Your <br /> Booking
            </h1>
            <p className="text-gray-400 text-balance">
              Enter your booking reference and email to view your reservation details
            </p>
          </div>

          {/* Search Form - hidden when booking found */ }
          { !bookingData && (
            <VerifyForm
              bookingReference={ bookingReference }
              email={ email }
              isLoading={ isLoading }
              onReferenceChange={ setBookingReference }
              onEmailChange={ setEmail }
              onSubmit={ handleVerify }
            />
          ) }

          {/* Search Another Button - shown when booking found */ }
          { bookingData && (
            <div className="mb-8">
              <Button
                variant="outline"
                onClick={ handleSearchAnother }
                className="w-full border-white/20 text-white hover:bg-white/10 uppercase tracking-widest"
              >
                Search Another Booking
              </Button>
            </div>
          ) }

          {/* Error State */ }
          <AnimatePresence>
            { error && (
              <motion.div
                initial={ { opacity: 0, y: -10 } }
                animate={ { opacity: 1, y: 0 } }
                exit={ { opacity: 0, y: -10 } }
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8 flex items-center gap-3"
              >
                <XCircle className="size-5 text-red-400" />
                <p className="text-red-400">{ error }</p>
              </motion.div>
            ) }
          </AnimatePresence>

          {/* Booking Card */ }
          <AnimatePresence>
            { bookingData && (
              <BookingCard
                booking={ bookingData }
                routeMapUrl={ routeMapUrl }
                onMapClick={ () => setShowMapOverlay( true ) }
              />
            ) }
          </AnimatePresence>

          {/* Help Text */ }
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>
              Can't find your booking reference? Check your confirmation email or{ " " }
              <a href="/contact" className="text-[#D4AF37] hover:underline">
                contact us
              </a>
              { " " }for assistance.
            </p>
          </div>
        </div>
      </section>

      {/* Map Overlay */ }
      <AnimatePresence>
        { showMapOverlay && routeMapUrl && (
          <MapOverlay
            mapUrl={ routeMapUrl }
            pickupLocation={ bookingData?.responses?.pickup }
            destinationLocation={ bookingData?.responses?.destination }
            onClose={ () => setShowMapOverlay( false ) }
          />
        ) }
      </AnimatePresence>

      {/* Booking Overlay */ }
      <BookingOverlay
        isOpen={ isBookingOpen }
        onClose={ () => setIsBookingOpen( false ) }
      />
    </main>
  );
}
