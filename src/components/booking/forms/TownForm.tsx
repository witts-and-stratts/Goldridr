import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Shared imports
import { TownFormSchema, ContactFormSchema, getFieldErrorMessage, type TownFormData } from "@/lib/form-schemas";
import { SuperField } from "@/components/ui/super-field";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { MapOverlay } from "@/components/booking/MapOverlay";

interface TownFormProps {
  onBack: () => void;
}

type BookingData = TownFormData;

export function TownForm( { onBack }: TownFormProps ) {
  const form = useForm( {
    defaultValues: {
      pickupLocation: "",
      dropoffLocation: "",
      date: new Date(),
      time: "",
    } as TownFormData,
    validators: {
      onChange: TownFormSchema,
    },
    onSubmit: async ( { value } ) => {
      setBookingData( value );
      setBookingStep( 'confirmation' );
    },
  } );

  const [ bookingStep, setBookingStep ] = useState<'form' | 'confirmation'>( 'form' );
  const [ bookingData, setBookingData ] = useState<BookingData | null>( null );
  const [ distanceData, setDistanceData ] = useState<{
    total_miles: number;
    duration_minutes: number;
    duration_text: string;
    price_per_mile: number;
    total_price: number;
  } | null>( null );
  const [ isDistanceLoading, setIsDistanceLoading ] = useState( false );
  const [ showMapOverlay, setShowMapOverlay ] = useState( false );
  const [ routeMapUrl, setRouteMapUrl ] = useState<{ small: string; large: string; } | null>( null );

  const contactForm = useForm( {
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
    validators: {
      onChange: ContactFormSchema,
    },
    onSubmit: async ( { value } ) => {
      toast.loading( "Processing your booking..." );
      try {
        const response = await fetch( "/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify( {
            date: bookingData?.date ? ( () => {
              const d = new Date( bookingData.date );
              const year = d.getFullYear();
              const month = String( d.getMonth() + 1 ).padStart( 2, '0' );
              const day = String( d.getDate() ).padStart( 2, '0' );
              return `${ year }-${ month }-${ day }`;
            } )() : "",
            time: bookingData?.time,
            duration: distanceData?.duration_minutes || 60,
            attendee: {
              name: value.name,
              email: value.email,
              phone: value.phone,
            },
            notes: value.notes,
            tripType: "city",
            tripDetails: {
              pickupLocation: bookingData?.pickupLocation,
              dropoffLocation: bookingData?.dropoffLocation,
              estimatedPrice: distanceData?.total_price,
              estimatedDistance: distanceData?.total_miles,
              estimatedDuration: distanceData?.duration_text,
              estimatedDurationMinutes: distanceData?.duration_minutes,
            },
          } ),
        } );
        const data = await response.json();
        toast.dismiss();
        if ( data.success ) {
          toast.success( "Booking confirmed!", {
            description: `Your booking reference is ${ data.booking?.reference || "" }. We'll send you a confirmation email shortly.`,
          } );
        } else {
          toast.error( "Booking failed", {
            description: data.error || "Please try again or contact us directly.",
          } );
        }
      } catch ( error ) {
        toast.dismiss();
        toast.error( "Booking failed", {
          description: "An unexpected error occurred. Please try again.",
        } );
      }
    },
  } );

  // Fetch distance and route map when entering confirmation
  useEffect( () => {
    if ( bookingStep === 'confirmation' && bookingData ) {
      const fetchDistance = async () => {
        setIsDistanceLoading( true );
        try {
          const response = await fetch(
            `/api/distance?origin=${ encodeURIComponent( bookingData.pickupLocation ) }&destination=${ encodeURIComponent( bookingData.dropoffLocation ) }&type=city`
          );
          const data = await response.json();
          if ( data.success ) {
            setDistanceData( data );
          }
        } catch ( error ) {
          console.error( 'Failed to fetch distance:', error );
        } finally {
          setIsDistanceLoading( false );
        }
      };

      const fetchRouteMap = async () => {
        try {
          const smallResponse = await fetch(
            `/api/route-map?origin=${ encodeURIComponent( bookingData.pickupLocation ) }&destination=${ encodeURIComponent( bookingData.dropoffLocation ) }&size=400x200`
          );
          const smallData = await smallResponse.json();
          const largeResponse = await fetch(
            `/api/route-map?origin=${ encodeURIComponent( bookingData.pickupLocation ) }&destination=${ encodeURIComponent( bookingData.dropoffLocation ) }&size=800x400`
          );
          const largeData = await largeResponse.json();
          if ( smallData.success && largeData.success ) {
            setRouteMapUrl( { small: smallData.staticMapUrl, large: largeData.staticMapUrl } );
          }
        } catch ( error ) {
          console.error( 'Failed to fetch route map:', error );
        }
      };

      fetchDistance();
      fetchRouteMap();
    }
  }, [ bookingStep, bookingData ] );

  // Confirmation View
  if ( bookingStep === 'confirmation' && bookingData ) {
    return (
      <motion.div
        initial={ { opacity: 0, x: 20 } }
        animate={ { opacity: 1, x: 0 } }
        exit={ { opacity: 0, x: -20 } }
        className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-8 backdrop-blur-md"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={ () => setBookingStep( 'form' ) }
          className="mb-6 text-white/70 hover:text-white hover:bg-white/10 -ml-2 uppercase tracking-widest"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Edit
        </Button>

        <div className="flex flex-col items-center justify-center gap-2 w-full mb-6 pb-12">
          <Image src="/assets/images/icon/city.svg" alt="Around Town" width={ 48 } height={ 48 } />
          <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Confirm Booking</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 -mt-2">
          <div>
            <form
              onSubmit={ ( e ) => {
                e.preventDefault();
                e.stopPropagation();
                contactForm.handleSubmit();
              } }
              className="space-y-4"
            >
              <contactForm.Field
                name="name"
                children={ ( field ) => (
                  <SuperField
                    type="text"
                    id={ field.name }
                    label="Full Name"
                    placeholder="John Doe"
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ getFieldErrorMessage( field.state.meta.errors ) }
                  />
                ) }
              />
              <contactForm.Field
                name="email"
                children={ ( field ) => (
                  <SuperField
                    type="email"
                    id={ field.name }
                    label="Email"
                    placeholder="john@example.com"
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ getFieldErrorMessage( field.state.meta.errors ) }
                  />
                ) }
              />
              <contactForm.Field
                name="phone"
                children={ ( field ) => (
                  <SuperField
                    type="tel"
                    id={ field.name }
                    label="Phone"
                    placeholder="+1 (555) 123-4567"
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ getFieldErrorMessage( field.state.meta.errors ) }
                  />
                ) }
              />
              <contactForm.Field
                name="notes"
                children={ ( field ) => (
                  <SuperField
                    type="textarea"
                    id={ field.name }
                    label="Special Requests (Optional)"
                    placeholder="Any special requests..."
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ getFieldErrorMessage( field.state.meta.errors ) }
                    className="min-h-[100px]"
                  />
                ) }
              />
              <contactForm.Subscribe
                selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
                children={ ( [ canSubmit, isSubmitting ] ) => (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={ !canSubmit }
                    className="w-full bg-gold text-black hover:bg-gold/80 uppercase mt-6"
                  >
                    { isSubmitting ? "..." : "Confirm Booking" }
                  </Button>
                ) }
              />
            </form>
          </div>

          {/* Booking Summary */ }
          <div className="overflow-hidden rounded-[10px] bg-black/60 text-white text-sm shadow-lg border border-border/20">
            {/* Trip Details */ }
            <div className="p-5 pt-4 space-y-4">
              <div className="flex justify-between">
                <div>
                  <span className="block text-xs text-gray-500">Date</span>
                  <span className="font-bold text-lg font-wide">{ new Date( bookingData.date ).toLocaleDateString( undefined, { day: 'numeric', month: 'short' } ) }</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-gray-500">Time</span>
                  <span className="font-bold text-lg font-wide">{ bookingData.time }</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-800 mx-5"></div>

            {/* Locations */ }
            <div className="p-5 pt-4 space-y-3 flex justify-between gap-5">
              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <span className="block text-xs text-gray-500">Pickup Location</span>
                  <span className="font-normal text-white text-lg">{ bookingData.pickupLocation }</span>
                </div>
                <div className="border-t border-dashed border-gray-800"></div>
                <div>
                  <span className="block text-xs text-gray-500">Dropoff Location</span>
                  <span className="font-normal text-white text-lg">{ bookingData.dropoffLocation }</span>
                </div>
              </div>
              <button
                type="button"
                onClick={ () => setShowMapOverlay( true ) }
                className="w-full aspect-4/3 rounded-lg overflow-hidden border border-white/10 hover:border-gold transition-colors"
              >
                { routeMapUrl ? (
                  <img src={ routeMapUrl.small } alt="Route map" className="w-full h-[100px] object-cover" />
                ) : (
                  <div className="w-full h-[100px] bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gold" />
                  </div>
                ) }
              </button>
            </div>

            <div className="border-t border-dashed border-gray-800 mx-5"></div>

            {/* Distance & Pricing */ }
            <div className="p-5 pt-4 space-y-3">
              { isDistanceLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gold" />
                  <span className="ml-2 text-sm text-gray-500">Calculating distance...</span>
                </div>
              ) : distanceData ? (
                <>
                  <div className="flex justify-between">
                    <div>
                      <span className="block text-xs text-gray-500">Distance</span>
                      <span className="font-bold text-lg font-wide">{ distanceData.total_miles } mi</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-gray-500">Est. Duration</span>
                      <span className="font-bold text-lg font-wide">{ distanceData.duration_text }</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-800 pt-3 mt-3">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>{ distanceData.total_miles } miles × ${ distanceData.price_per_mile.toFixed( 2 ) }/mi</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gray-500">Estimated Total</span>
                      <span className="text-2xl font-bold text-gold font-wide">${ distanceData.total_price.toFixed( 2 ) }</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-gray-500 py-2">Unable to calculate distance</div>
              ) }
            </div>
          </div>
        </div>

        {/* Map Overlay */ }
        <AnimatePresence>
          { showMapOverlay && (
            <motion.div
              initial={ { opacity: 0 } }
              animate={ { opacity: 1 } }
              exit={ { opacity: 0 } }
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={ () => setShowMapOverlay( false ) }
            >
              <motion.div
                initial={ { scale: 0.9, opacity: 0 } }
                animate={ { scale: 1, opacity: 1 } }
                exit={ { scale: 0.9, opacity: 0 } }
                className="relative w-full max-w-3xl bg-black rounded-xl border border-white/10 overflow-hidden"
                onClick={ ( e ) => e.stopPropagation() }
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="text-white font-wide uppercase tracking-wider">Route Map</h3>
                  <Button variant="ghost" size="icon" onClick={ () => setShowMapOverlay( false ) } className="text-white/70 hover:text-white">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  { routeMapUrl ? (
                    <img src={ routeMapUrl.large } alt="Route map" className="w-full rounded-lg" />
                  ) : (
                    <div className="w-full h-[400px] bg-black/40 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-gold" />
                    </div>
                  ) }
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">A</div>
                      <div>
                        <span className="text-gray-500 block text-xs">Pickup</span>
                        <span className="text-white">{ bookingData.pickupLocation }</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">B</div>
                      <div>
                        <span className="text-gray-500 block text-xs">Dropoff</span>
                        <span className="text-white">{ bookingData.dropoffLocation }</span>
                      </div>
                    </div>
                  </div>
                  { distanceData && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-white">
                      <span>{ distanceData.total_miles } miles • { distanceData.duration_text }</span>
                      <span className="font-bold text-gold">${ distanceData.total_price.toFixed( 2 ) }</span>
                    </div>
                  ) }
                </div>
              </motion.div>
            </motion.div>
          ) }
        </AnimatePresence>
      </motion.div>
    );
  }

  // Form View
  return (
    <motion.div
      initial={ { opacity: 0, x: 20 } }
      animate={ { opacity: 1, x: 0 } }
      exit={ { opacity: 0, x: -20 } }
      className="relative w-full max-w-lg rounded-xl border border-white/10 bg-black/60 p-8 backdrop-blur-md"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={ onBack }
        className="absolute top-8 left-8 h-8 w-8 rounded-full border border-white/10 text-white hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <div className="flex flex-col items-center justify-center gap-2 w-full md:mb-6 py-8 md:py-12">
        <Image src="/assets/images/icon/city.svg" alt="Around Town" width={ 48 } height={ 48 } />
        <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Around Town</h2>
      </div>

      <form
        onSubmit={ ( e ) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        } }
        className="space-y-4"
      >
        <FieldGroup>
          <form.Field
            name="pickupLocation"
            children={ ( field ) => (
              <SuperField
                type="location"
                id={ field.name }
                label="Pickup Location"
                placeholder="Enter pickup address"
                value={ field.state.value }
                onChange={ field.handleChange }
                onBlur={ field.handleBlur }
                error={ getFieldErrorMessage( field.state.meta.errors ) }
              />
            ) }
          />

          <form.Field
            name="dropoffLocation"
            children={ ( field ) => (
              <SuperField
                type="location"
                id={ field.name }
                label="Dropoff Location"
                placeholder="Enter destination"
                value={ field.state.value }
                onChange={ field.handleChange }
                onBlur={ field.handleBlur }
                error={ getFieldErrorMessage( field.state.meta.errors ) }
              />
            ) }
          />

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="date"
              children={ ( field ) => (
                <SuperField
                  type="datepicker"
                  id={ field.name }
                  label="Date"
                  value={ field.state.value }
                  onChange={ ( val ) => field.handleChange( val ?? field.state.value ) }
                  onBlur={ field.handleBlur }
                  error={ getFieldErrorMessage( field.state.meta.errors ) }
                />
              ) }
            />

            <form.Field
              name="time"
              children={ ( field ) => (
                <SuperField
                  type="timepicker"
                  id={ field.name }
                  label="Time"
                  value={ field.state.value }
                  onChange={ ( e ) => field.handleChange( e.target.value ) }
                  onBlur={ field.handleBlur }
                  error={ getFieldErrorMessage( field.state.meta.errors ) }
                />
              ) }
            />
          </div>
        </FieldGroup>

        <form.Subscribe
          selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
          children={ ( [ canSubmit, isSubmitting ] ) => (
            <Button
              type="submit"
              size="lg"
              disabled={ !canSubmit }
              className="mt-4 w-full bg-gold text-black hover:bg-gold/80 uppercase"
            >
              { isSubmitting ? "..." : "Check Rates" }
            </Button>
          ) }
        />
      </form>
    </motion.div>
  );
}
